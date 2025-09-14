'use client';

import React from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Grid,
  Menu,
  MenuItem,
  IconButton,
  Typography,
  TextField,
  Stack,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputLabel,
  FormControl,
  Select,
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import SendIcon from '@mui/icons-material/Send';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import PaymentsIcon from '@mui/icons-material/Payments';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs, { Dayjs } from 'dayjs';
import { createClient } from '@supabase/supabase-js';

// ---- Supabase client (env vars come from your .env.local) ----
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

// PDF receipt to include in WhatsApp messages
const PDF_URL =
  'https://drive.google.com/file/d/18Sm8_Q_mg2yT1YHUh1JKTHlmXDwAyCpc/view?usp=drive_link';

// ---------------- Types ----------------
type Enquiry = {
  id: string;
  name: string;
  phone: string;
  amount: number;
  event_date: string; // ISO date
  status: 'enquiry' | 'active';
  created_at: string;
};

type Booking = {
  id: string;
  enquiry_id: string | null;
  name: string;
  phone: string;
  amount: number;
  advance: number;
  remaining_amount: number;
  event_date: string; // ISO
  status: 'active' | 'completed' | 'cancelled';
  created_at: string;
};

// ---------------- Helpers ----------------
const toWhatsAppUrl = (phoneRaw: string, text: string) => {
  // Accept numbers with or without +. wa.me requires country code w/o plus.
  const normalized = phoneRaw.replace(/[^\d]/g, '');
  return `https://wa.me/${normalized}?text=${encodeURIComponent(text)}`;
};

// ---------------- Page ----------------
export default function CustomerEnquiryPage() {
  // Form state
  const [name, setName] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [amount, setAmount] = React.useState<number | ''>('');
  const [eventDate, setEventDate] = React.useState<Dayjs | null>(dayjs());

  // Table data
  const [rows, setRows] = React.useState<Enquiry[]>([]);
  const [loading, setLoading] = React.useState(true);

  // Filters
  const [searchText, setSearchText] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('');
  const [dateFilter, setDateFilter] = React.useState<Dayjs | null>(null);

  // Actions menu
  const [menuAnchor, setMenuAnchor] = React.useState<null | HTMLElement>(null);
  const [activeRow, setActiveRow] = React.useState<Enquiry | null>(null);

  // Edit dialog
  const [editOpen, setEditOpen] = React.useState(false);
  const [editDraft, setEditDraft] = React.useState<Partial<Enquiry>>({});

  // Convert-to-booking dialog
  const [bookOpen, setBookOpen] = React.useState(false);
  const [advance, setAdvance] = React.useState<number | ''>('');

  const openMenu = Boolean(menuAnchor);

  const fetchRows = React.useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('customer_enquiries')
      .select('*');

    if (searchText) {
      query = query.or(`name.ilike.%${searchText}%,phone.ilike.%${searchText}%`);
    }

    if (statusFilter) {
      query = query.eq('status', statusFilter);
    }

    if (dateFilter) {
      query = query.eq('event_date', dateFilter.format('YYYY-MM-DD'));
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (!error && data) setRows(data as Enquiry[]);
    setLoading(false);
  }, [searchText, statusFilter, dateFilter]);

  React.useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  const handleClearFilters = () => {
    setSearchText('');
    setStatusFilter('');
    setDateFilter(null);
  };

  // ---- Create enquiry (no WhatsApp here anymore) ----
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone || !eventDate || amount === '') return;

    const payload = {
      name,
      phone,
      amount: Number(amount),
      event_date: eventDate.startOf('day').toISOString(),
      status: 'enquiry' as const,
    };

    const { error } = await supabase.from('customer_enquiries').insert(payload);
    if (!error) {
      setName('');
      setPhone('');
      setAmount('');
      setEventDate(dayjs());
      fetchRows();
    } else {
      console.error(error);
    }
  };

  // ---- Actions menu handlers ----
  const handleOpenMenu = (
    e: React.MouseEvent<HTMLButtonElement>,
    row: Enquiry,
  ) => {
    setActiveRow(row);
    setMenuAnchor(e.currentTarget);
  };

  const handleCloseMenu = () => {
    setMenuAnchor(null);
  };

  const handleSendWhatsApp = () => {
    if (!activeRow) return;
    const text = `Hello ${activeRow.name},

Thanks for your enquiry!

Details:
• Event Date: ${dayjs(activeRow.event_date).format('DD MMM YYYY')}
• Amount: ₹${activeRow.amount}

Please review the attached PDF link:
${PDF_URL}

We’ll get back to you shortly.`;
    const url = toWhatsAppUrl(activeRow.phone, text);
    // open in new tab
    window.open(url, '_blank', 'noopener,noreferrer');
    handleCloseMenu();
  };

  const handleDelete = async () => {
    if (!activeRow) return;
    const { error } = await supabase.from('customer_enquiries').delete().eq('id', activeRow.id);
    if (!error) fetchRows();
    handleCloseMenu();
  };

  const handleEdit = () => {
    if (!activeRow) return;
    setEditDraft({
      id: activeRow.id,
      name: activeRow.name,
      phone: activeRow.phone,
      amount: activeRow.amount,
      event_date: activeRow.event_date,
    });
    setEditOpen(true);
    handleCloseMenu();
  };

  const commitEdit = async () => {
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
      fetchRows();
    }
  };

  // ---- Convert to booking (sets enquiry status active + insert booking) ----
  const openBooking = (row: Enquiry) => {
    setActiveRow(row);
    setAdvance('');
    setBookOpen(true);
  };

  const commitBooking = async () => {
    if (!activeRow) return;
    const advNum = Number(advance) || 0;
    const remaining = Math.max(0, Number(activeRow.amount) - advNum);

    const { error: insertErr } = await supabase.from('bookings').insert({
      enquiry_id: activeRow.id,
      name: activeRow.name,
      phone: activeRow.phone,
      amount_total: Number(activeRow.amount || 0),
      advance_paid: advNum,
      remaining_amount: remaining,
      initial_amount_total: Number(activeRow.amount || 0),
      event_date: activeRow.event_date,
      status: 'active',
    } as Partial<Booking>);

    if (insertErr) {
      console.error(insertErr);
      return;
    }

    // Mark enquiry active
    const { error: updErr } = await supabase
      .from('customer_enquiries')
      .update({ status: 'active' })
      .eq('id', activeRow.id);

    if (!updErr) {
      setBookOpen(false);
      fetchRows();
    }
  };

  // ---------------- Render ----------------
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Customer Enquiry
      </Typography>

      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            New Enquiry
          </Typography>
          <Box component="form" onSubmit={onSubmit} sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              <Grid xs={12} md={4}>
                <TextField
                  label="Name"
                  fullWidth
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </Grid>
              <Grid xs={12} md={4}>
                <TextField
                  label="Phone (WhatsApp)"
                  fullWidth
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </Grid>
              <Grid xs={12} md={2}>
                <TextField
                  label="Amount (₹)"
                  type="number"
                  fullWidth
                  required
                  inputProps={{ min: 0, step: '0.01' }}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                />
              </Grid>
              <Grid xs={12} md={2}>
                <DatePicker
                  label="Event Date"
                  value={eventDate}
                  onChange={setEventDate}
                  minDate={dayjs().startOf('day')}
                  format="DD-MM-YYYY" // Added format prop
                  slotProps={{ textField: { fullWidth: true, required: true } }}
                />
              </Grid>
              <Grid xs={12}>
                <Stack direction="row" gap={2} justifyContent="flex-end">
                  <Button type="submit" variant="contained">
                    Save Enquiry
                  </Button>
                </Stack>
              </Grid>
            </Grid>
          </Box>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            All Enquiries
          </Typography>

          <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
            <TextField
              label="Search by Name or Phone"
              variant="outlined"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              sx={{ flex: 1 }}
            />
            <FormControl sx={{ minWidth: 120 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                label="Status"
                onChange={(e) => setStatusFilter(e.target.value as string)}
              >
                <MenuItem value="">
                  <em>All</em>
                </MenuItem>
                <MenuItem value="enquiry">Enquiry</MenuItem>
                <MenuItem value="active">Active</MenuItem>
              </Select>
            </FormControl>
            <DatePicker
              label="Event Date"
              value={dateFilter}
              onChange={(newValue) => setDateFilter(newValue)}
            />
            <Button variant="outlined" onClick={handleClearFilters}>Clear</Button>
          </Box>

          <Box sx={{ width: '100%', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: 8 }}>Name</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>Phone</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>Date</th>
                  <th style={{ textAlign: 'right', padding: 8 }}>Amount (₹)</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>Status</th>
                  <th style={{ textAlign: 'center', padding: 8 }}>Convert to Booking</th>
                  <th style={{ textAlign: 'center', padding: 8 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} style={{ borderTop: '1px solid #eee' }}>
                    <td style={{ padding: 8 }}>{r.name}</td>
                    <td style={{ padding: 8 }}>{r.phone}</td>
                    <td style={{ padding: 8 }}>
                      {dayjs(r.event_date).format('DD MMM YYYY')}
                    </td>
                    <td style={{ padding: 8, textAlign: 'right' }}>
                      {Number(r.amount).toFixed(2)}
                    </td>
                    <td style={{ padding: 8 }}>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: 999,
                          background:
                            r.status === 'active' ? 'rgba(25,118,210,.1)' : 'rgba(0,0,0,.06)',
                          color: r.status === 'active' ? '#1976d2' : '#555',
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td style={{ padding: 8, textAlign: 'center' }}>
                      <Tooltip title="Convert to Booking">
                        <span>
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<PaymentsIcon />}
                            onClick={() => openBooking(r)}
                          >
                            Convert
                          </Button>
                        </span>
                      </Tooltip>
                    </td>
                    <td style={{ padding: 8, textAlign: 'center' }}>
                      <IconButton
                        aria-label="more"
                        onClick={(e) => handleOpenMenu(e, r)}
                      >
                        <MoreVertIcon />
                      </IconButton>
                    </td>
                  </tr>
                ))}
                {(!rows || rows.length === 0) && !loading && (
                  <tr>
                    <td colSpan={7} style={{ padding: 16, textAlign: 'center', color: '#777' }}>
                      No enquiries yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </Box>
        </CardContent>
      </Card>

      {/* Actions Menu */} 
      <Menu
        anchorEl={menuAnchor}
        open={openMenu}
        onClose={handleCloseMenu}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <MenuItem onClick={handleSendWhatsApp}>
          <SendIcon fontSize="small" style={{ marginRight: 8 }} /> Send WhatsApp receipt
        </MenuItem>
        <MenuItem onClick={handleEdit}>
          <EditIcon fontSize="small" style={{ marginRight: 8 }} /> Edit
        </MenuItem>
        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
          <DeleteIcon fontSize="small" style={{ marginRight: 8 }} /> Delete
        </MenuItem>
      </Menu>

      {/* Edit Dialog */} 
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Enquiry</DialogTitle>
        <DialogContent dividers>
          <Stack gap={2} mt={1}>
            <TextField
              label="Name"
              value={editDraft.name ?? ''}
              onChange={(e) => setEditDraft((d) => ({ ...d, name: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Phone"
              value={editDraft.phone ?? ''}
              onChange={(e) => setEditDraft((d) => ({ ...d, phone: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Amount (₹)"
              type="number"
              value={editDraft.amount as number}
              onChange={(e) =>
                setEditDraft((d) => ({ ...d, amount: Number(e.target.value) }))
              }
              fullWidth
            />
            <DatePicker
              label="Event Date"
              value={editDraft.event_date ? dayjs(editDraft.event_date) : null}
              onChange={(v) =>
                setEditDraft((d) => ({
                  ...d,
                  event_date: v ? v.startOf('day').toISOString() : d.event_date,
                }))
              }
              minDate={dayjs().startOf('day')}
              slotProps={{ textField: { fullWidth: true } }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={commitEdit}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Convert to Booking Dialog */} 
      <Dialog open={bookOpen} onClose={() => setBookOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Convert to Booking</DialogTitle>
        <DialogContent dividers>
          <Typography sx={{ mb: 2 }}>
            Enter advance received for <strong>{activeRow?.name}</strong>.
          </Typography>
          <TextField
            autoFocus
            label="Advance (₹)"
            type="number"
            fullWidth
            value={advance}
            onChange={(e) => setAdvance(e.target.value === '' ? '' : Number(e.target.value))}
            inputProps={{ min: 0, step: '0.01' }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBookOpen(false)}>Cancel</Button>
          <Button onClick={commitBooking} variant="contained" startIcon={<PaymentsIcon />}>
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
