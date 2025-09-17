"use client";

import * as React from "react";
import { createClient } from "@supabase/supabase-js";
import {
  Box,
  Container,
  Typography,
  Button,
  Modal,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Snackbar,
  Alert,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
} from "@mui/material";
import { DataGrid, GridColDef, GridActionsCellItem } from "@mui/x-data-grid";
import { Edit as EditIcon, Delete as DeleteIcon, ReceiptLong as ReceiptLongIcon, Cancel as CancelIcon } from '@mui/icons-material';
import dayjs, { Dayjs } from "dayjs";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { TimePicker } from "@mui/x-date-pickers/TimePicker";

const SUPABASE_URL = "https://taiwczeqmpyxtendwnpu.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRhaXdjemVxbXB5eHRlbmR3bnB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY4NjAyNDYsImV4cCI6MjA2MjQzNjI0Nn0.3LrZqyy-KC3-TwZEytoHzEyK3HG52U7vlwb2VAhsVX8";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

interface CustomEvent {
  date: Dayjs | null;
  time: Dayjs | null;
  function: string;
  service: string;
}

interface WeddingActive {
  id: number;
  name: string;
  phone: string;
  amount_total: number;
  advance_paid: number;
  remaining_amount: number;
  event_date: string;
  status: 'active' | 'completed' | 'cancelled';
  package: string;
  custom_events: CustomEvent[] | null;
}

export default function ActiveCustomersPage() {
  const [rows, setRows] = React.useState<WeddingActive[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [current, setCurrent] = React.useState<WeddingActive | null>(null);
  const [finalPaymentModalOpen, setFinalPaymentModalOpen] = React.useState(false);
  const [finalPayment, setFinalPayment] = React.useState("");
  const [editModalOpen, setEditModalOpen] = React.useState(false);
  const [editDraft, setEditDraft] = React.useState<Partial<WeddingActive>>({});
  const [cancelOpen, setCancelOpen] = React.useState(false);
  const [filters, setFilters] = React.useState({
    name: "",
    status: "",
    package: "",
    date: null as Dayjs | null,
  });
  const [paginationModel, setPaginationModel] = React.useState({ page: 0, pageSize: 20 });
  const [snack, setSnack] = React.useState<{ open: boolean; msg: string; type: 'success' | 'error' }>({ open: false, msg: '', type: 'success' });

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("wedding_active")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error) {
      setRows(data as WeddingActive[]);
    }
    setLoading(false);
  };

  React.useEffect(() => {
    load();
  }, []);

  const handleOpenEditModal = (customer: WeddingActive) => {
    setCurrent(customer);
    setEditDraft(customer);
    setEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setEditModalOpen(false);
    setEditDraft({});
    setCurrent(null);
  };

  const handleUpdateActiveCustomer = async () => {
    if (!editDraft.id) return;
    const { error } = await supabase
      .from("wedding_active")
      .update(editDraft)
      .eq("id", editDraft.id);

    if (error) {
      console.error("Error updating active customer:", error);
      setSnack({ open: true, msg: error.message, type: 'error' });
    } else {
      console.log("Active customer updated successfully");
      setSnack({ open: true, msg: 'Customer updated successfully', type: 'success' });
      handleCloseEditModal();
      load();
    }
  };

  const handleDelete = async (customer: WeddingActive) => {
    if (!confirm(`Are you sure you want to delete the booking for ${customer.name}?`)) return;
    const { error } = await supabase.from("wedding_active").delete().eq("id", customer.id);
    if (error) {
      console.error("Error deleting active customer:", error);
      setSnack({ open: true, msg: error.message, type: 'error' });
    } else {
      console.log("Active customer deleted successfully");
      setSnack({ open: true, msg: 'Customer deleted successfully', type: 'success' });
      load();
    }
  };

  const handleOpenFinalPaymentModal = (customer: WeddingActive) => {
    setCurrent(customer);
    setFinalPayment(customer.remaining_amount.toString());
    setFinalPaymentModalOpen(true);
  };

  const handleCloseFinalPaymentModal = () => {
    setFinalPaymentModalOpen(false);
    setFinalPayment("");
    setCurrent(null);
  };

  const handleSendFinalReceipt = async () => {
    if (!current || !finalPayment) return;

    // Update database first
    const { error: dbError } = await supabase
      .from("wedding_active")
      .update({
        status: "completed",
        remaining_amount: 0,
        advance_paid: current.amount_total,
      })
      .eq("id", current.id);

    if (dbError) {
      setSnack({ open: true, msg: dbError.message, type: 'error' });
      console.error("Error updating status:", dbError);
      return;
    }

    // Now call the API to generate PDF and WhatsApp link
    try {
      const resp = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: current.id,
          finalAmount: Number(finalPayment),
          bookingType: 'wedding',
        }),
      });

      const j = await resp.json().catch(() => ({}));
      if (resp.ok && j.ok && j.whatsappUrl) {
        window.open(j.whatsappUrl, '_blank', 'noopener,noreferrer');
        setSnack({ open: true, msg: 'Final receipt uploaded and link sent on WhatsApp', type: 'success' });
      } else {
        setSnack({ open: true, msg: j.error || 'Could not send WhatsApp receipt.', type: 'error' });
        console.error("Error from API:", j.error || 'Could not send WhatsApp receipt.');
      }
    } catch (e: any) {
      setSnack({ open: true, msg: 'Could not call API to send receipt.', type: 'error' });
      console.error("API call error:", e);
    }

    handleCloseFinalPaymentModal();
    load();
  };

  const openCancelDialog = (customer: WeddingActive) => {
    setCurrent(customer);
    setCancelOpen(true);
  };

  const handleConfirmCancel = async () => {
    if (!current) return;
    const { error } = await supabase
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('id', current.id);

    if (error) {
      setSnack({ open: true, msg: error.message, type: 'error' });
    } else {
      setSnack({ open: true, msg: 'Booking cancelled', type: 'success' });
      setCancelOpen(false);
      setCurrent(null);
      load();
    }
  };

  const handleEditEventChange = (
    index: number,
    field: keyof CustomEvent,
    value: any
  ) => {
    const newEvents = [...(editDraft.custom_events || [])];
    newEvents[index] = { ...newEvents[index], [field]: value };
    setEditDraft({ ...editDraft, custom_events: newEvents });
  };

  const handleAddEventToDraft = () => {
    const newEvents = [...(editDraft.custom_events || [])];
    newEvents.push({ date: null, time: null, function: "", service: "" });
    setEditDraft({ ...editDraft, custom_events: newEvents });
  };

  const filteredRows = rows.filter((row) => {
    const nameMatch =
      !filters.name ||
      row.name.toLowerCase().includes(filters.name.toLowerCase()) ||
      row.phone.includes(filters.name);
    const statusMatch = !filters.status || row.status === filters.status;
    const packageMatch = !filters.package || row.package === filters.package;
    const dateMatch =
      !filters.date || dayjs(row.event_date).isSame(filters.date, "day");
    return nameMatch && statusMatch && packageMatch && dateMatch;
  });

  const columns: GridColDef<WeddingActive>[] = [
    { field: 'name', headerName: 'Name', flex: 1, minWidth: 150 },
    { field: 'phone', headerName: 'Phone', width: 130 },
    { field: 'package', headerName: 'Package', width: 120 },
    { field: 'amount_total', headerName: 'Total (₹)', type: 'number', width: 120 },
    { field: 'advance_paid', headerName: 'Advance (₹)', type: 'number', width: 120 },
    { field: 'remaining_amount', headerName: 'Remaining (₹)', type: 'number', width: 130 },
    {
        field: 'event_date',
        headerName: 'Event Date',
        width: 150,
        valueFormatter: (value: string) => value ? dayjs(value).format('DD MMM YYYY') : '',
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: (params) => {
        const status = params.value as WeddingActive['status'];
        let color: 'primary' | 'success' | 'error' | 'default' = 'default';
        if (status === 'active') color = 'primary';
        if (status === 'completed') color = 'success';
        if (status === 'cancelled') color = 'error';
        return <Chip label={status} color={color} size="small" />;
      },
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Actions',
      width: 120,
      getActions: (params) => [
        <GridActionsCellItem
          key="edit"
          icon={<EditIcon />}
          label="Edit"
          onClick={() => handleOpenEditModal(params.row)}
          showInMenu
        />,
        <GridActionsCellItem
          key="cancel"
          icon={<CancelIcon />}
          label="Cancel Booking"
          onClick={() => openCancelDialog(params.row)}
          showInMenu
        />,
        <GridActionsCellItem
          key="receipt"
          icon={<ReceiptLongIcon />}
          label="Send Final Receipt"
          onClick={() => handleOpenFinalPaymentModal(params.row)}
          showInMenu
        />,
        <GridActionsCellItem
          key="delete"
          icon={<DeleteIcon />}
          label="Delete"
          onClick={() => handleDelete(params.row)}
          showInMenu
        />,
      ],
    },
];

  return (
    <main>
      <Box
        sx={{
          bgcolor: "background.paper",
          borderBottom: (t) => `1px solid ${t.palette.divider}`,
        }}
      >
        <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
          <Typography variant="h3" component="h1" fontWeight={700} gutterBottom>
            Wedding Studio - Active Customers
          </Typography>
          <Typography variant="body1" color="text.secondary">
            View and manage ongoing wedding studio customers.
          </Typography>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexDirection: { xs: 'column', md: 'row' }, alignItems: { xs: 'stretch', md: 'center' } }}>
          <TextField
            label="Search by Name or Phone"
            value={filters.name}
            onChange={(e) => setFilters({ ...filters, name: e.target.value })}
            variant="outlined"
            sx={{ flexGrow: { md: 1 } }}
          />
          <FormControl variant="outlined" sx={{ minWidth: { md: 120 } }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              label="Status"
            >
              <MenuItem value="">
                <em>All</em>
              </MenuItem>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
              <MenuItem value="cancelled">Cancelled</MenuItem>
            </Select>
          </FormControl>
          <FormControl variant="outlined" sx={{ minWidth: { md: 120 } }}>
            <InputLabel>Package</InputLabel>
            <Select
              value={filters.package}
              onChange={(e) => setFilters({ ...filters, package: e.target.value })}
              label="Package"
            >
              <MenuItem value="">
                <em>All</em>
              </MenuItem>
              <MenuItem value="regular">Regular</MenuItem>
              <MenuItem value="premium">Premium</MenuItem>
              <MenuItem value="custom">Custom</MenuItem>
            </Select>
          </FormControl>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DatePicker
              label="Filter by Event Date"
              value={filters.date}
              onChange={(newValue) => setFilters({ ...filters, date: newValue })}
            />
          </LocalizationProvider>
        </Box>
        
        <Box sx={{ height: 650, width: '100%' }}>
            <DataGrid
                rows={filteredRows}
                columns={columns}
                loading={loading}
                getRowId={(r) => r.id}
                pagination
                pageSizeOptions={[20, 50, 100]}
                paginationModel={paginationModel}
                onPaginationModelChange={setPaginationModel}
                disableRowSelectionOnClick
            />
        </Box>

        <Modal open={finalPaymentModalOpen} onClose={handleCloseFinalPaymentModal}>
          <Box sx={{ ...style, width: 400 }}>
            <Typography variant="h6" component="h2">
              Send Final Receipt
            </Typography>
            <TextField
              fullWidth
              label="Final Payment"
              type="number"
              value={finalPayment}
              onChange={(e) => setFinalPayment(e.target.value)}
              margin="normal"
            />
            <Button onClick={handleSendFinalReceipt} variant="contained">
              Send Receipt
            </Button>
          </Box>
        </Modal>

        <Dialog open={editModalOpen} onClose={handleCloseEditModal} fullWidth maxWidth="md">
          <DialogTitle>Edit Active Customer</DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2} sx={{ mt: 1 }}>
                <TextField
                fullWidth
                label="Name"
                value={editDraft.name || ""}
                onChange={(e) => setEditDraft({ ...editDraft, name: e.target.value })}
                margin="normal"
                />
                <TextField
                fullWidth
                label="Phone"
                value={editDraft.phone || ""}
                onChange={(e) => setEditDraft({ ...editDraft, phone: e.target.value })}
                margin="normal"
                />
                <TextField
                fullWidth
                label="Total Amount"
                type="number"
                value={editDraft.amount_total || ""}
                onChange={(e) => setEditDraft({ ...editDraft, amount_total: Number(e.target.value) })}
                margin="normal"
                />
                <TextField
                fullWidth
                label="Advance Paid"
                type="number"
                value={editDraft.advance_paid || ""}
                onChange={(e) => setEditDraft({ ...editDraft, advance_paid: Number(e.target.value) })}
                margin="normal"
                />
                <TextField
                fullWidth
                label="Remaining Amount"
                type="number"
                value={editDraft.remaining_amount || ""}
                onChange={(e) => setEditDraft({ ...editDraft, remaining_amount: Number(e.target.value) })}
                margin="normal"
                />
                <FormControl fullWidth margin="normal">
                <InputLabel>Package</InputLabel>
                <Select
                    value={editDraft.package || ""}
                    onChange={(e) => setEditDraft({ ...editDraft, package: e.target.value })}
                    label="Package"
                >
                    <MenuItem value="regular">Regular Package</MenuItem>
                    <MenuItem value="premium">Premium Package</MenuItem>
                    <MenuItem value="custom">Custom Package</MenuItem>
                </Select>
                </FormControl>
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DatePicker
                    label="Event Date"
                    value={editDraft.event_date ? dayjs(editDraft.event_date) : null}
                    onChange={(newValue) => setEditDraft({ ...editDraft, event_date: newValue?.toISOString() })}
                />
                </LocalizationProvider>

                {editDraft.package === "custom" && (
                <Box sx={{ mt: 2 }}>
                    <Typography variant="h6" gutterBottom>
                    Custom Package Details
                    </Typography>
                    {(editDraft.custom_events || []).map((event, index) => (
                    <Box
                        key={index}
                        sx={{
                        display: "flex",
                        gap: 2,
                        mb: 2,
                        alignItems: "center",
                        flexWrap: 'wrap'
                        }}
                    >
                        <LocalizationProvider dateAdapter={AdapterDayjs}>
                        <DatePicker
                            label="Event Date"
                            value={event.date ? dayjs(event.date) : null}
                            onChange={(newValue) =>
                            handleEditEventChange(index, "date", newValue)
                            }
                        />
                        <TimePicker
                            label="Event Time"
                            value={event.time ? dayjs(event.time) : null}
                            onChange={(newValue) =>
                            handleEditEventChange(index, "time", newValue)
                            }
                        />
                        </LocalizationProvider>
                        <TextField
                        label="Function"
                        value={event.function}
                        onChange={(e) =>
                            handleEditEventChange(index, "function", e.target.value)
                        }
                        />
                        <TextField
                        label="Service"
                        value={event.service}
                        onChange={(e) =>
                            handleEditEventChange(index, "service", e.target.value)
                        }
                        />
                    </Box>
                    ))}
                    <Button onClick={handleAddEventToDraft}>Add Event</Button>
                </Box>
                )}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseEditModal}>Cancel</Button>
            <Button onClick={handleUpdateActiveCustomer} variant="contained">
              Save Changes
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={cancelOpen} onClose={() => setCancelOpen(false)} fullWidth maxWidth="xs">
            <DialogTitle>Confirm Cancellation</DialogTitle>
            <DialogContent>
            <Typography>
                Are you sure you want to cancel the booking for <strong>{current?.name}</strong>?
            </Typography>
            {current && current.remaining_amount > 0 && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                This booking has a remaining balance of ₹{current.remaining_amount}. Cancelling will not clear this balance.
                </Alert>
            )}
            </DialogContent>
            <DialogActions>
            <Button onClick={() => setCancelOpen(false)}>Back</Button>
            <Button variant="contained" color="error" onClick={handleConfirmCancel}>
                Confirm Cancel
            </Button>
            </DialogActions>
        </Dialog>

      </Container>
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
    </main>
  );
}

const style = {
  position: 'absolute' as 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 400,
  bgcolor: 'background.paper',
  border: '2px solid #000',
  boxShadow: 24,
  p: 4,
};