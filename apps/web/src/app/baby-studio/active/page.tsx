'use client';

import * as React from 'react';
import dayjs from 'dayjs';
import {
  Box,
  Container,
  Typography,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  SelectChangeEvent,
} from '@mui/material';
import {
  DataGrid,
  GridColDef,
  GridActionsCellItem,
} from '@mui/x-data-grid';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { Edit as EditIcon, Delete as DeleteIcon, ReceiptLong as ReceiptLongIcon, AddCard as AddCardIcon } from '@mui/icons-material';
import { createClient } from '@supabase/supabase-js';

type BookingRow = {
  id: string;
  name: string;
  phone: string;
  status: 'active' | 'completed' | 'cancelled';
  event_date: string;       // ISO string (DATE in DB)
  amount_total: number;
  advance_paid: number;
  remaining_amount: number;
  initial_amount_total?: number;
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
);

export default function ActiveCustomersPage() {
  const [rows, setRows] = React.useState<BookingRow[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [snack, setSnack] = React.useState<{ open: boolean; msg: string; type: 'success' | 'error' }>({ open: false, msg: '', type: 'success' });

  // filters
  const [searchText, setSearchText] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('');
  const [dateFilter, setDateFilter] = React.useState<dayjs.Dayjs | null>(null);

  const handleClearFilters = () => {
    setSearchText('');
    setStatusFilter('');
    setDateFilter(null);
  };

  // dialogs
  const [editOpen, setEditOpen] = React.useState(false);
  const [advanceOpen, setAdvanceOpen] = React.useState(false);
  const [finalOpen, setFinalOpen] = React.useState(false);
  const [current, setCurrent] = React.useState<BookingRow | null>(null);
  const [form, setForm] = React.useState({ name: '', phone: '', amount_total: 0, event_date: '' });
  const [advance, setAdvance] = React.useState<number>(0);
  const [finalAmount, setFinalAmount] = React.useState<number>(0);

  const load = React.useCallback(async () => {
    setLoading(true);
    let query = supabase.from('bookings').select('*');

    if (searchText) {
      query = query.or(`name.ilike.%${searchText}%,phone.ilike.%${searchText}%`);
    }

    if (statusFilter) {
      query = query.eq('status', statusFilter);
    }

    if (dateFilter) {
      query = query.eq('event_date', dateFilter.format('YYYY-MM-DD'));
    }

    const { data, error } = await query.order('event_date', { ascending: true });

    if (error) {
      setSnack({ open: true, msg: error.message, type: 'error' });
    } else {
      setRows((data ?? []) as BookingRow[]);
    }
    setLoading(false);
  }, [searchText, statusFilter, dateFilter]);

  React.useEffect(() => {
    load();
  }, [load]);

  const openEdit = (row: BookingRow) => {
    setCurrent(row);
    setForm({
      name: row.name,
      phone: row.phone,
      amount_total: row.amount_total,
      event_date: row.event_date,
    });
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!current) return;
    const newTotal = Number(form.amount_total || 0);
    const newRemaining = Math.max(0, newTotal - Number(current.advance_paid || 0));

    const { error } = await supabase.from('bookings').update({
      name: form.name,
      phone: form.phone,
      amount_total: newTotal,
      event_date: form.event_date,
      remaining_amount: newRemaining,
    }).eq('id', current.id);

    if (error) setSnack({ open: true, msg: error.message, type: 'error' });
    else {
      setSnack({ open: true, msg: 'Updated', type: 'success' });
      setEditOpen(false);
      setCurrent(null);
      load();
    }
  };

  const deleteRow = async (row: BookingRow) => {
    if (!confirm(`Delete booking for ${row.name}?`)) return;
    const { error } = await supabase.from('bookings').delete().eq('id', row.id);
    if (error) setSnack({ open: true, msg: error.message, type: 'error' });
    else {
      setSnack({ open: true, msg: 'Deleted', type: 'success' });
      load();
    }
  };

  const openAdvance = (row: BookingRow) => {
    setCurrent(row);
    setAdvance(0);
    setAdvanceOpen(true);
  };
  const saveAdvance = async () => {
    if (!current) return;
    const newAdvance = Number(current.advance_paid) + Number(advance || 0);
    const remaining = Math.max(0, Number(current.amount_total) - newAdvance);

    const { error } = await supabase.from('bookings').update({
      advance_paid: newAdvance,
      remaining_amount: remaining,
    }).eq('id', current.id);

    if (error) setSnack({ open: true, msg: error.message, type: 'error' });
    else {
      setSnack({ open: true, msg: 'Advance recorded', type: 'success' });
      setAdvanceOpen(false);
      setCurrent(null);
      load();
    }
  };

  const phoneE164 = (raw?: string) => {
    const digits = (raw || '').replace(/\D/g, '');
    // Assume India if 10-digit; tweak as needed
    if (digits.length === 10) return `+91${digits}`;
    if (digits.startsWith('0') && digits.length === 11) return `+91${digits.slice(1)}`;
    if (digits.startsWith('91') && digits.length === 12) return `+${digits}`;
    return `+${digits}`;
  };

  const openWhatsAppChat = (rawPhone: string, text: string) => {
    const phone = (rawPhone || '').replace(/\D/g, '');
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const openFinal = (row: BookingRow) => {
    setCurrent(row);
    setFinalAmount(row.remaining_amount || 0);
    setFinalOpen(true);
  };
  const sendFinal = async () => {
    if (!current) return;

    const final = Number(finalAmount);
    const total = Number(current.amount_total || current.initial_amount_total);
    const newAdvance = Number(current.advance_paid) + final;
    const remaining = Math.max(0, total - newAdvance);
    const status: BookingRow['status'] = remaining <= 0 && total > 0 ? 'completed' : 'active';

    // No longer opening WhatsApp with generic message here.
    // The API will return the full WhatsApp URL with the PDF link.

    // Then, update database and try to send attachment in the background.
    const { error: dbError } = await supabase.from('bookings').update({
      advance_paid: newAdvance,
      remaining_amount: remaining,
      status,
    }).eq('id', current.id);

    if (dbError) {
      setSnack({ open: true, msg: dbError.message, type: 'error' });
      // still close dialog and reload
    } else {
      // DB update was fine. Now try the API.
      try {
        const resp = await fetch('/api/whatsapp/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bookingId: current.id,
            finalAmount: final,
            bookingType: 'baby', // Added bookingType
          }),
        });

        const j = await resp.json().catch(() => ({}));
        if (resp.ok && j.ok && j.whatsappUrl) { // Changed condition
          // Directly open WhatsApp with the URL from the API
          window.open(j.whatsappUrl, '_blank', 'noopener,noreferrer'); // Use window.open directly
          setSnack({ open: true, msg: 'Final receipt uploaded to Supabase Storage and link sent on WhatsApp', type: 'success' });
        } else {
          setSnack({ open: true, msg: j.error || 'Could not upload PDF to Supabase Storage.', type: 'error' });
        }
      } catch (e: any) {
        setSnack({ open: true, msg: 'Could not upload PDF to Supabase Storage.', type: 'error' }); // Changed error message
      }
    }

    setFinalOpen(false);
    setCurrent(null);
    load();
  };

  const cols: GridColDef<BookingRow>[] = [
    { field: 'name', headerName: 'Name', flex: 1, minWidth: 140 },
    { field: 'phone', headerName: 'Number', width: 140 },
    { field: 'status', headerName: 'Status', width: 110 },
    {
      field: 'event_date',
      headerName: 'Event Date',
      width: 150,
      valueFormatter: (value: string) =>
        value ? dayjs(value).format('DD MMM YYYY') : '',
    },
    { field: 'amount_total', headerName: 'Amount (₹)', width: 130, type: 'number' },
    { field: 'advance_paid', headerName: 'Advance (₹)', width: 130, type: 'number' },
    { field: 'remaining_amount', headerName: 'Remaining (₹)', width: 140, type: 'number' },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Actions',
      width: 170,
      getActions: (params) => [
        <GridActionsCellItem
          key="edit"
          icon={<EditIcon />}
          label="Edit"
          onClick={() => openEdit(params.row)}
          showInMenu
        />,
        <GridActionsCellItem
          key="advance"
          icon={<AddCardIcon />}
          label="Add advance"
          onClick={() => openAdvance(params.row)}
          showInMenu
        />,
        <GridActionsCellItem
          key="receipt"
          icon={<ReceiptLongIcon />}
          label="Send final receipt"
          onClick={() => openFinal(params.row)}
          showInMenu
        />,
        <GridActionsCellItem
          key="delete"
          icon={<DeleteIcon />}
          label="Delete"
          onClick={() => deleteRow(params.row)}
          showInMenu
        />,
      ],
    },
  ];

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Active Customers
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
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="completed">Completed</MenuItem>
            <MenuItem value="cancelled">Cancelled</MenuItem>
          </Select>
        </FormControl>
        <DatePicker
          label="Event Date"
          value={dateFilter}
          onChange={(newValue) => setDateFilter(newValue)}
        />
        <Button variant="outlined" onClick={handleClearFilters}>Clear</Button>
      </Box>

      <Box sx={{ height: 560, width: '100%' }}>
        <DataGrid
          rows={rows}
          columns={cols}
          loading={loading}
          getRowId={(r) => r.id}
          disableRowSelectionOnClick
        />
      </Box>

      {/* Edit dialog */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Edit booking</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2, pt: 2 }}>
          <TextField
            label="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            fullWidth
          />
          <TextField
            label="Phone"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            fullWidth
          />
          <TextField
            label="Amount (₹)"
            type="number"
            value={form.amount_total}
            onChange={(e) => setForm({ ...form, amount_total: Number(e.target.value || 0) })}
            fullWidth
          />
          <TextField
            label="Event Date (ISO)"
            value={form.event_date}
            onChange={(e) => setForm({ ...form, event_date: e.target.value })}
            helperText="Keep ISO format (YYYY-MM-DD)"
            fullWidth
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={saveEdit}>Save</Button>
        </DialogActions>
      </Dialog>

      {/* Advance dialog */}
      <Dialog open={advanceOpen} onClose={() => setAdvanceOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Add advance</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField
            autoFocus
            label="Advance amount (₹)"
            type="number"
            value={advance}
            onChange={(e) => setAdvance(Number(e.target.value || 0))}
            fullWidth
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAdvanceOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={saveAdvance}>Save</Button>
        </DialogActions>
      </Dialog>

      {/* Final receipt dialog */}
      <Dialog open={finalOpen} onClose={() => setFinalOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Send final receipt</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField
            autoFocus
            label="Final amount to collect (₹)"
            type="number"
            value={finalAmount}
            onChange={(e) => setFinalAmount(Number(e.target.value || 0))}
            fullWidth
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFinalOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={sendFinal}>Send</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snack.open}
        autoHideDuration={3000}
        onClose={() => setSnack({ ...snack, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snack.type} variant="filled">
          {snack.msg}
        </Alert>
      </Snackbar>
    </Container>
  );
}
