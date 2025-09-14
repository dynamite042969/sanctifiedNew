import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  Modal,
  Linking,
  Platform,
  StyleSheet,
  Alert,
} from 'react-native';
import DateTimePicker, { AndroidNativeProps } from '@react-native-community/datetimepicker';
import dayjs from 'dayjs';
import { useTheme, type Theme } from './ThemeContext';
import supabase from '../supabase/supabaseClient';

const PDF_URL =
  'https://drive.google.com/file/d/18Sm8_Q_mg2yT1YHUh1JKTHlmXDwAyCpc/view?usp=drive_link';

type Enquiry = {
  id: string;
  name: string;
  phone: string;
  amount: number;
  event_date: string; // ISO
  status: 'enquiry' | 'active' | 'completed';
  created_at: string;
};

export default function CustomerEnquiryScreen() {
  const { theme, isDark } = useTheme();
  const styles = getStyles(theme);

  // form
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState<Date>(new Date());
  const [showPicker, setShowPicker] = useState(false);

  // table
  const [rows, setRows] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(true);

  // actions modal
  const [actionsOpen, setActionsOpen] = useState(false);
  const [activeRow, setActiveRow] = useState<Enquiry | null>(null);

  // edit modal
  const [editOpen, setEditOpen] = useState(false);
  const [editDraft, setEditDraft] = useState<Partial<Enquiry>>({});

  // convert modal
  const [convertOpen, setConvertOpen] = useState(false);
  const [advance, setAdvance] = useState('');

  const minDate = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('customer_enquiries')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) setRows(data as Enquiry[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    if (!name || !phone || !amount) return;
    const iso = dayjs(date).startOf('day').toISOString();
    const { error } = await supabase.from('customer_enquiries').insert({
      name,
      phone,
      amount: Number(amount),
      event_date: iso,
      status: 'enquiry',
    });
    if (error) {
      Alert.alert('Error', error.message);
      return;
    }
    setName('');
    setPhone('');
    setAmount('');
    setDate(new Date());
    load();
  };

  const openActions = (row: Enquiry) => {
    setActiveRow(row);
    setActionsOpen(true);
  };

  const closeActions = () => setActionsOpen(false);

  const sendWhatsApp = () => {
    if (!activeRow) return;
    const msg = `Hello ${activeRow.name},

Thanks for your enquiry!

Details:
• Event Date: ${dayjs(activeRow.event_date).format('DD MMM YYYY')}
• Amount: ₹${activeRow.amount}

Please review the attached PDF link:
${PDF_URL}`;

    const normalized = activeRow.phone.replace(/[^\d]/g, '');
    const url = `https://wa.me/${normalized}?text=${encodeURIComponent(msg)}`;
    Linking.openURL(url);
    closeActions();
  };

  const del = async () => {
    if (!activeRow) return;
    const { error } = await supabase.from('customer_enquiries').delete().eq('id', activeRow.id);
    if (!error) load();
    closeActions();
  };

  const openEdit = () => {
    if (!activeRow) return;
    setEditDraft({
      id: activeRow.id,
      name: activeRow.name,
      phone: activeRow.phone,
      amount: activeRow.amount,
      event_date: activeRow.event_date,
    });
    setEditOpen(true);
    closeActions();
  };

  const saveEdit = async () => {
    if (!editDraft.id) return;
    const { error } = await supabase
      .from('customer_enquiries')
      .update({
        name: editDraft.name,
        phone: editDraft.phone,
        amount: Number(editDraft.amount),
        event_date: editDraft.event_date,
      })
      .eq('id', editDraft.id);
    if (!error) {
      setEditOpen(false);
      load();
    }
  };

  const openConvert = (row: Enquiry) => {
    setActiveRow(row);
    setAdvance('');
    setConvertOpen(true);
  };

  const doConvert = async () => {
    if (!activeRow) return;
    const adv = Number(advance) || 0;
    const total = Number(activeRow.amount) || 0;
    const remaining = Math.max(0, total - adv);
    const status = total > 0 && remaining === 0 ? 'completed' : 'active';

    const { error: insErr } = await supabase.from('bookings').insert({
      enquiry_id: activeRow.id,
      name: activeRow.name,
      phone: activeRow.phone,
      amount_total: total,
      initial_amount_total: total, // NEW: keep the original total
      advance_paid: adv,
      remaining_amount: remaining,
      event_date: activeRow.event_date,
      status,
    });

    if (insErr) {
      Alert.alert('Error', insErr.message);
      return;
    }

    const { error: updErr } = await supabase
      .from('customer_enquiries')
      .update({ status })
      .eq('id', activeRow.id);

    if (!updErr) {
      setConvertOpen(false);
      load();
    }
  };

  const onChangeDate: AndroidNativeProps['onChange'] = (_, d) => {
    setShowPicker(false);
    if (d && d >= minDate) setDate(d);
  };

  const renderRow = ({ item }: { item: Enquiry }) => (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.meta}>
          {dayjs(item.event_date).format('DD MMM YYYY')} • ₹{Number(item.amount).toFixed(2)}
        </Text>
        <Text
          style={[
            styles.status,
            item.status === 'active'
              ? styles.statusActive
              : item.status === 'completed'
              ? styles.statusDone
              : styles.statusEnquiry,
          ]}
        >
          {item.status}
        </Text>
      </View>
      <Pressable style={styles.convertBtn} onPress={() => openConvert(item)}>
        <Text style={styles.convertText}>Convert</Text>
      </Pressable>
      <Pressable style={styles.menuBtn} onPress={() => openActions(item)}>
        <Text style={styles.menuDots}>⋮</Text>
      </Pressable>
    </View>
  );

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <Text style={styles.h1}>Customer Enquiry</Text>

      {/* Form */}
      <View style={styles.card}>
        <TextInput style={styles.input} placeholder="Name" value={name} onChangeText={setName} />
        <TextInput
          style={styles.input}
          placeholder="Phone (WhatsApp)"
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
        />
        <TextInput
          style={styles.input}
          placeholder="Amount (₹)"
          keyboardType="numeric"
          value={amount}
          onChangeText={setAmount}
        />

        <Pressable style={styles.dateBtn} onPress={() => setShowPicker(true)}>
          <Text style={styles.dateBtnText}>{`Event Date: ${dayjs(date).format('DD MMM YYYY')}`}</Text>
        </Pressable>

        {showPicker && (
          <DateTimePicker
            mode="date"
            value={date}
            minimumDate={minDate}
            onChange={onChangeDate}
            themeVariant={isDark ? 'dark' : 'light'}
          />
        )}

        <Pressable style={styles.saveBtn} onPress={save}>
          <Text style={styles.saveText}>Save Enquiry</Text>
        </Pressable>
      </View>

      {/* Table */}
      <Text style={styles.h2}>All Enquiries</Text>
      <FlatList
        data={rows}
        keyExtractor={(i) => i.id}
        renderItem={renderRow}
        contentContainerStyle={{ paddingBottom: 120 }}
      />

      {/* Actions modal */}
      <Modal visible={actionsOpen} transparent animationType="fade" onRequestClose={closeActions}>
        <Pressable style={[styles.backdrop, { backgroundColor: theme.backdrop }]} onPress={closeActions} />
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>{activeRow?.name}</Text>

          <Pressable style={styles.sheetBtn} onPress={sendWhatsApp}>
            <Text style={styles.sheetBtnText}>Send WhatsApp receipt</Text>
          </Pressable>
          <Pressable style={styles.sheetBtn} onPress={openEdit}>
            <Text style={styles.sheetBtnText}>Edit</Text>
          </Pressable>
          <Pressable style={[styles.sheetBtn, { backgroundColor: theme.dangerBg }]} onPress={del}>
            <Text style={[styles.sheetBtnText, { color: '#c00' }]}>Delete</Text>
          </Pressable>

          <Pressable style={styles.sheetCancel} onPress={closeActions}>
            <Text style={styles.sheetCancelText}>Close</Text>
          </Pressable>
        </View>
      </Modal>

      {/* Edit modal */}
      <Modal visible={editOpen} transparent animationType="fade" onRequestClose={() => setEditOpen(false)}>
        <Pressable style={[styles.backdrop, { backgroundColor: theme.backdrop }]} onPress={() => setEditOpen(false)} />
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>Edit Enquiry</Text>
          <TextInput
            style={styles.input}
            placeholder="Name"
            value={editDraft.name as string}
            onChangeText={(t) => setEditDraft((d) => ({ ...d, name: t }))}
          />
          <TextInput
            style={styles.input}
            placeholder="Phone"
            value={editDraft.phone as string}
            onChangeText={(t) => setEditDraft((d) => ({ ...d, phone: t }))}
          />
          <TextInput
            style={styles.input}
            placeholder="Amount (₹)"
            keyboardType="numeric"
            value={String(editDraft.amount ?? '')}
            onChangeText={(t) => setEditDraft((d) => ({ ...d, amount: Number(t || 0) }))}
          />
          <Pressable
            style={styles.dateBtn}
            onPress={() => {
              setShowPicker(true);
            }}
          >
            <Text style={styles.dateBtnText}>
              {`Event Date: ${
                editDraft.event_date ? dayjs(editDraft.event_date).format('DD MMM YYYY') : ''
              }`}
            </Text>
          </Pressable>
          {showPicker && (
            <DateTimePicker
              mode="date"
              value={editDraft.event_date ? new Date(editDraft.event_date) : new Date()}
              minimumDate={minDate}
              themeVariant={isDark ? 'dark' : 'light'}
              onChange={(_, d) => {
                setShowPicker(false);
                if (d && d >= minDate) {
                  setEditDraft((draft) => ({
                    ...draft,
                    event_date: dayjs(d).startOf('day').toISOString(),
                  }));
                }
              }}
            />
          )}

          <Pressable style={styles.saveBtn} onPress={saveEdit}>
            <Text style={styles.saveText}>Save</Text>
          </Pressable>
          <Pressable style={styles.sheetCancel} onPress={() => setEditOpen(false)}>
            <Text style={styles.sheetCancelText}>Close</Text>
          </Pressable>
        </View>
      </Modal>

      {/* Convert modal */}
      <Modal
        visible={convertOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setConvertOpen(false)}
      >
        <Pressable style={[styles.backdrop, { backgroundColor: theme.backdrop }]} onPress={() => setConvertOpen(false)} />
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>Convert to Booking</Text>
          <Text style={{ marginBottom: 8 }}>Advance for {activeRow?.name}</Text>
          <TextInput
            style={styles.input}
            placeholder="Advance (₹)"
            keyboardType="numeric"
            value={advance}
            onChangeText={setAdvance}
          />
          <Pressable style={styles.saveBtn} onPress={doConvert}>
            <Text style={styles.saveText}>Confirm</Text>
          </Pressable>
          <Pressable style={styles.sheetCancel} onPress={() => setConvertOpen(false)}>
            <Text style={styles.sheetCancelText}>Close</Text>
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    screen: { flex: 1, padding: 16 },
    h1: { fontSize: 22, fontWeight: '700', marginBottom: 12, color: theme.text },
    h2: { fontSize: 18, fontWeight: '700', marginTop: 12, marginBottom: 8, color: theme.text },
    card: { backgroundColor: theme.card, padding: 12, borderRadius: 12, marginBottom: 12, elevation: 1 },
    input: {
      borderWidth: 1,
      borderColor: theme.inputBorder,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginBottom: 10,
      backgroundColor: theme.input,
      color: theme.text,
    },
    dateBtn: { padding: 12, borderRadius: 8, backgroundColor: theme.primary, opacity: 0.8, marginBottom: 10 },
    dateBtnText: { color: theme.primaryText, fontWeight: '600' },
    saveBtn: { backgroundColor: theme.primary, borderRadius: 8, padding: 12, alignItems: 'center' },
    saveText: { color: theme.primaryText, fontWeight: '700' },

    row: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      backgroundColor: theme.card,
      borderRadius: 12,
      marginBottom: 10,
    },
    name: { fontSize: 16, fontWeight: '700', color: theme.text },
    meta: { color: theme.muted, marginTop: 2 },
    status: {
      marginTop: 6,
      alignSelf: 'flex-start',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 999,
      fontWeight: '700',
    },
    statusEnquiry: { backgroundColor: theme.statusEnquiryBg, color: theme.statusEnquiryText },
    statusActive: { backgroundColor: theme.statusActiveBg, color: theme.statusActiveText },
    statusDone: { backgroundColor: theme.statusDoneBg, color: theme.statusDoneText },
    convertBtn: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderWidth: 1,
      borderColor: theme.primary,
      borderRadius: 8,
      marginRight: 6,
    },
    convertText: { color: theme.primary, fontWeight: '700' },
    menuBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
    menuDots: { fontSize: 20, fontWeight: '900', color: theme.text },

    backdrop: { flex: 1 },
    sheet: {
      position: 'absolute',
      left: 16,
      right: 16,
      bottom: 16,
      backgroundColor: theme.sheet,
      borderRadius: 16,
      padding: 16,
    },
    sheetTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8, color: theme.text },
    sheetBtn: { padding: 12, borderRadius: 8, backgroundColor: theme.sheetButton, marginTop: 8 },
    sheetBtnText: { fontWeight: '700', color: theme.sheetButtonText },
    sheetCancel: { padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 12, backgroundColor: theme.sheetCancel },
    sheetCancelText: { fontWeight: '700', color: theme.sheetCancelText },
  });
