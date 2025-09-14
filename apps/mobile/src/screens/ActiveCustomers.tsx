import React, { useEffect, useState } from 'react';
import {
  View,
  FlatList,
  Linking,
  Alert,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
  Platform,
} from 'react-native';
import { Text } from 'react-native';
import supabase from '../supabase/supabaseClient';
import { useTheme, type Theme } from './ThemeContext';

type Booking = {
  id: string;
  name: string;
  phone: string;
  status: 'active' | 'enquiry' | 'completed';
  event_date: string; // ISO
  amount_total: number | null;
  initial_amount_total?: number | null;
  advance_paid: number | null;
  remaining_amount: number | null;
};

const API_BASE =
  Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';

const n = (v: any) => (Number.isFinite(Number(v)) ? Number(v) : 0);

export default function ActiveCustomersScreen() {
  const { theme } = useTheme();
  const styles = getStyles(theme);

  const [rows, setRows] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  const [modal, setModal] = useState<'edit' | 'advance' | 'final' | null>(null);
  const [active, setActive] = useState<Booking | null>(null);
  const [form, setForm] = useState<{
    name: string;
    phone: string;
    amount_total: string;
    event_date: string;
  }>({
    name: '',
    phone: '',
    amount_total: '',
    event_date: '',
  });
  const [advance, setAdvance] = useState<string>('0');
  const [finalAmt, setFinalAmt] = useState<string>('0');

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .order('event_date', { ascending: true });
    if (!error) setRows((data ?? []) as Booking[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const openAdvance = (b: Booking) => {
    setActive(b);
    setAdvance('0');
    setModal('advance');
  };

  const saveAdvance = async () => {
    if (!active) return;
    const plus = n(advance);
    const already = n(active.advance_paid);
    const total = n(active.amount_total ?? active.initial_amount_total);
    const newAdv = already + plus;
    const rem = Math.max(0, total - newAdv);
    const status: Booking['status'] = total > 0 && rem === 0 ? 'completed' : 'active';

    const { error } = await supabase
      .from('bookings')
      .update({ advance_paid: newAdv, remaining_amount: rem, status })
      .eq('id', active.id);

    if (error) Alert.alert('Error', error.message);
    setModal(null);
    setActive(null);
    load();
  };

  const openFinal = (b: Booking) => {
    setActive(b);
    setFinalAmt(String(n(b.remaining_amount)));
    setModal('final');
  };

  const openWhatsAppChat = (rawPhone: string, text: string) => {
    const phone = (rawPhone || '').replace(/\D/g, '');
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
    Linking.openURL(url);
  };

  const sendFinalReceipt = async () => {
    if (!active) return;

    try {
      const paidNow = n(finalAmt);
      const already = n(active.advance_paid);
      const total = n(active.amount_total ?? active.initial_amount_total);
      const newAdv = already + paidNow;
      const rem = Math.max(0, total - newAdv);
      const status: Booking['status'] = total > 0 && rem === 0 ? 'completed' : 'active';

      // Update booking so the PDF shows the right figures
      const { error } = await supabase
        .from('bookings')
        .update({
          advance_paid: newAdv,
          remaining_amount: rem,
          status,
        })
        .eq('id', active.id);

      if (error) {
        Alert.alert('Error', error.message);
        return;
      }

      // Ask web API to generate PDF & send it via WhatsApp Business
      const resp = await fetch(`${API_BASE}/api/whatsapp/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: active.id, finalAmount: paidNow }),
      });

      const j = await resp.json().catch(() => ({}));

      if (!resp.ok || !j.ok) {
        // fallback to opening chat with plain text
        const msg = [
          `Final receipt for ${active.name}`,
          `Event: ${active.event_date || '-'}`,
          `Total: ₹${total}`,
          `Paid now: ₹${paidNow}`,
          `Remaining: ₹${rem}`,
        ].join('\n');
        openWhatsAppChat(active.phone, msg);
        Alert.alert(
          'WhatsApp',
          j.error || 'Attachment send failed; opened WhatsApp chat with text instead.'
        );
      } else {
        const note = [
          `Hi ${active.name},`,
          `Your final receipt has been sent as an attachment.`,
          `Total: ₹${total}, Paid now: ₹${paidNow}, Remaining: ₹${rem}`,
        ].join(' ');
        openWhatsAppChat(active.phone, note);
      }
    } catch (e: any) {
      const paidNow = n(finalAmt);
      const total = n(active.amount_total ?? active.initial_amount_total);
      const rem = Math.max(0, total - (n(active.advance_paid) + paidNow));
      const msg = [
        `Final receipt for ${active?.name ?? ''}`,
        `Event: ${active?.event_date ?? '-'}`,
        `Total: ₹${total}`,
        `Paid now: ₹${paidNow}`,
        `Remaining: ₹${rem}`,
      ].join('\n');
      openWhatsAppChat(active?.phone ?? '', msg);
      Alert.alert('WhatsApp', e?.message || 'Failed to send; opened WhatsApp chat instead.');
    } finally {
      setModal(null);
      setActive(null);
      load();
    }
  };

  const openEdit = (b: Booking) => {
    setActive(b);
    setForm({
      name: b.name,
      phone: b.phone,
      amount_total: String(n(b.amount_total ?? b.initial_amount_total)),
      event_date: b.event_date,
    });
    setModal('edit');
  };

  const saveEdit = async () => {
    if (!active) return;
    const amt = n(form.amount_total);
    const adv = n(active.advance_paid);
    const rem = Math.max(0, amt - adv);
    const status: Booking['status'] = amt > 0 && rem === 0 ? 'completed' : 'active';

    const { error } = await supabase
      .from('bookings')
      .update({
        name: form.name,
        phone: form.phone,
        amount_total: amt,
        remaining_amount: rem,
        status,
        event_date: form.event_date,
      })
      .eq('id', active.id);

    if (error) Alert.alert('Error', error.message);
    setModal(null);
    setActive(null);
    load();
  };

  const del = async (b: Booking) => {
    Alert.alert('Delete', `Delete booking for ${b.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('bookings').delete().eq('id', b.id);
          if (error) Alert.alert('Error', error.message);
          else load();
        },
      },
    ]);
  };

  const totalOf = (b: Booking) => n(b.amount_total ?? b.initial_amount_total);

  const renderItem = ({ item }: { item: Booking }) => (
    <View style={styles.card}>
      <Text style={styles.title}>{item.name}</Text>
      <Text style={styles.text}>Phone: {item.phone}</Text>
      <Text style={styles.text}>Status: {item.status}</Text>
      <Text style={styles.text}>Event: {item.event_date}</Text>
      <Text style={styles.text}>Total: ₹{totalOf(item)}</Text>
      <Text style={styles.text}>
        Advance: ₹{n(item.advance_paid)} • Remaining: ₹{n(item.remaining_amount)}
      </Text>
      <View style={styles.row}>
        <Pressable style={[styles.btn, styles.blue]} onPress={() => openEdit(item)}>
          <Text style={styles.btnT}>Edit</Text>
        </Pressable>
        <Pressable style={[styles.btn, styles.green]} onPress={() => openAdvance(item)}>
          <Text style={styles.btnT}>Add advance</Text>
        </Pressable>
        <Pressable style={[styles.btn, styles.purple]} onPress={() => openFinal(item)}>
          <Text style={styles.btnT}>Final receipt</Text>
        </Pressable>
        <Pressable style={[styles.btn, styles.red]} onPress={() => del(item)}>
          <Text style={styles.btnT}>Delete</Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, padding: 12, backgroundColor: theme.background }}>
      <FlatList
        data={rows}
        keyExtractor={(i) => i.id}
        refreshing={loading}
        onRefresh={load}
        renderItem={renderItem}
        ListEmptyComponent={!loading ? <Text>No active customers</Text> : null}
      />

      {/* Advance modal */}
      <Modal
        visible={modal === 'advance'}
        transparent
        animationType="slide"
        onRequestClose={() => setModal(null)}
      >
        <View style={styles.modalWrap}>
          <View style={styles.modalBody}>
            <Text style={styles.modalTitle}>Add advance for {active?.name}</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={advance}
              onChangeText={setAdvance}
              placeholder="Amount (₹)"
            />
            <View style={styles.row}>
              <Pressable style={[styles.btn, styles.grey]} onPress={() => setModal(null)}>
                <Text style={styles.btnT}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.btn, styles.green]} onPress={saveAdvance}>
                <Text style={styles.btnT}>Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Final modal */}
      <Modal
        visible={modal === 'final'}
        transparent
        animationType="slide"
        onRequestClose={() => setModal(null)}
      >
        <View style={styles.modalWrap}>
          <View style={styles.modalBody}>
            <Text style={styles.modalTitle}>Final receipt for {active?.name}</Text>
            <Text style={styles.text}>Remaining: ₹{active ? n(active.remaining_amount) : 0}</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={finalAmt}
              onChangeText={setFinalAmt}
              placeholder="Final amount (₹)"
            />
            <View style={styles.row}>
              <Pressable style={[styles.btn, styles.grey]} onPress={() => setModal(null)}>
                <Text style={styles.btnT}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.btn, styles.purple]} onPress={sendFinalReceipt}>
                <Text style={styles.btnT}>Send & Open WhatsApp</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit modal */}
      <Modal
        visible={modal === 'edit'}
        transparent
        animationType="slide"
        onRequestClose={() => setModal(null)}
      >
        <View style={styles.modalWrap}>
          <View style={styles.modalBody}>
            <Text style={styles.modalTitle}>Edit booking</Text>
            <TextInput
              style={styles.input}
              value={form.name}
              onChangeText={(t) => setForm((f) => ({ ...f, name: t }))}
              placeholder="Name"
            />
            <TextInput
              style={styles.input}
              value={form.phone}
              onChangeText={(t) => setForm((f) => ({ ...f, phone: t }))}
              placeholder="Phone"
              keyboardType="phone-pad"
            />
            <TextInput
              style={styles.input}
              value={form.amount_total}
              onChangeText={(t) => setForm((f) => ({ ...f, amount_total: t }))}
              placeholder="Total (₹)"
              keyboardType="numeric"
            />
            <TextInput
              style={styles.input}
              value={form.event_date}
              onChangeText={(t) => setForm((f) => ({ ...f, event_date: t }))}
              placeholder="Event date YYYY-MM-DD"
            />
            <View style={styles.row}>
              <Pressable style={[styles.btn, styles.grey]} onPress={() => setModal(null)}>
                <Text style={styles.btnT}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.btn, styles.blue]} onPress={saveEdit}>
                <Text style={styles.btnT}>Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    card: {
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.inputBorder,
      marginBottom: 12,
      backgroundColor: theme.card,
    },
    title: { fontSize: 18, fontWeight: '700', marginBottom: 6, color: theme.text },
    text: { color: theme.text },
    row: { flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' },
    btn: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8 },
    btnT: { color: '#fff', fontWeight: '700' },
    blue: { backgroundColor: '#1976d2' },
    green: { backgroundColor: '#2e7d32' },
    purple: { backgroundColor: '#6a1b9a' },
    red: { backgroundColor: '#d32f2f' },
    grey: { backgroundColor: '#6b7280' },
    modalWrap: { flex: 1, backgroundColor: theme.backdrop, justifyContent: 'center', padding: 18 },
    modalBody: { backgroundColor: theme.sheet, borderRadius: 12, padding: 16, gap: 10 },
    modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 6, color: theme.text },
    input: { borderWidth: 1, borderColor: theme.inputBorder, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, color: theme.text, backgroundColor: theme.input },
  });
