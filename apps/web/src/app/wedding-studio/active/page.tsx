"use client";

import * as React from "react";
import { createClient } from "@supabase/supabase-js";
import {
  Box,
  Container,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Modal,
  Menu,
  MenuItem,
  IconButton,
  TextField,
  FormControl,
  InputLabel,
  Select,
  TablePagination,
} from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVert";
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
  status: string;
  package: string;
  custom_events: CustomEvent[] | null;
}

export default function ActiveCustomersPage() {
  const [rows, setRows] = React.useState<WeddingActive[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedCustomer, setSelectedCustomer] = React.useState<WeddingActive | null>(null);
  const [finalPaymentModalOpen, setFinalPaymentModalOpen] = React.useState(false);
  const [finalPayment, setFinalPayment] = React.useState("");
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [editModalOpen, setEditModalOpen] = React.useState(false);
  const [editDraft, setEditDraft] = React.useState<Partial<WeddingActive>>({});
  const [filters, setFilters] = React.useState({
    name: "",
    status: "",
    package: "",
    date: null as Dayjs | null,
  });
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(20);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("wedding_active")
      .select("*")
      .order("id", { ascending: false });
    if (!error) {
      setRows(data as WeddingActive[]);
    }
    setLoading(false);
  };

  React.useEffect(() => {
    load();
  }, []);

  const handleOpenActionsMenu = (event: React.MouseEvent<HTMLElement>, customer: WeddingActive) => {
    setAnchorEl(event.currentTarget);
    setSelectedCustomer(customer);
  };

  const handleCloseActionsMenu = () => {
    setAnchorEl(null);
    setSelectedCustomer(null);
  };

  const handleOpenEditModal = () => {
    if (!selectedCustomer) return;
    setEditDraft(selectedCustomer);
    setEditModalOpen(true);
    handleCloseActionsMenu();
  };

  const handleCloseEditModal = () => {
    setEditModalOpen(false);
    setEditDraft({});
  };

  const handleUpdateActiveCustomer = async () => {
    if (!editDraft.id) return;
    const { error } = await supabase
      .from("wedding_active")
      .update(editDraft)
      .eq("id", editDraft.id);

    if (error) {
      console.error("Error updating active customer:", error);
    } else {
      console.log("Active customer updated successfully");
      handleCloseEditModal();
      load();
    }
  };

  const handleDelete = async () => {
    if (!selectedCustomer) return;
    const { error } = await supabase.from("wedding_active").delete().eq("id", selectedCustomer.id);
    if (error) {
      console.error("Error deleting active customer:", error);
    } else {
      console.log("Active customer deleted successfully");
      load();
    }
    handleCloseActionsMenu();
  };

  const handleOpenFinalPaymentModal = () => {
    if (selectedCustomer) {
      setFinalPayment(selectedCustomer.remaining_amount.toString());
    }
    setFinalPaymentModalOpen(true);
    setAnchorEl(null);
  };

  const handleCloseFinalPaymentModal = () => {
    setFinalPaymentModalOpen(false);
    setFinalPayment("");
    setSelectedCustomer(null);
  };

  const handleSendFinalReceipt = async () => {
    if (!selectedCustomer || !finalPayment) return;

    const { error } = await supabase
      .from("wedding_active")
      .update({
        status: "completed",
        remaining_amount: 0,
        advance_paid: selectedCustomer.amount_total,
      })
      .eq("id", selectedCustomer.id);

    if (error) {
      console.error("Error updating status:", error);
      return;
    }

    const message = `Hello ${selectedCustomer.name}, thank you for your final payment of ₹${finalPayment}.`;
    const whatsappUrl = `https://wa.me/${selectedCustomer.phone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
    handleCloseFinalPaymentModal();
    load();
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

  const paginatedRows = filteredRows.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

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
            Active Customers
          </Typography>
          <Typography variant="body1" color="text.secondary">
            View and manage ongoing wedding studio customers.
          </Typography>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <TextField
            label="Search by Name or Phone"
            value={filters.name}
            onChange={(e) => setFilters({ ...filters, name: e.target.value })}
            variant="outlined"
            fullWidth
          />
          <FormControl variant="outlined" sx={{ minWidth: 120 }}>
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
            </Select>
          </FormControl>
          <FormControl variant="outlined" sx={{ minWidth: 120 }}>
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
        <TableContainer component={Paper} elevation={3}>
          <Table sx={{ minWidth: 650 }} aria-label="simple table">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Phone</TableCell>
                <TableCell>Package</TableCell>
                <TableCell>Total Amount</TableCell>
                <TableCell>Advance Paid</TableCell>
                <TableCell>Remaining</TableCell>
                <TableCell>Event Date</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} align="center">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : (
                paginatedRows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.name}</TableCell>
                    <TableCell>{row.phone}</TableCell>
                    <TableCell>{row.package}</TableCell>
                    <TableCell>₹{row.amount_total}</TableCell>
                    <TableCell>₹{row.advance_paid}</TableCell>
                    <TableCell>₹{row.remaining_amount}</TableCell>
                    <TableCell>{dayjs(row.event_date).format("DD/MM/YYYY")}</TableCell>
                    <TableCell>{row.status}</TableCell>
                    <TableCell>
                      <IconButton onClick={(e) => handleOpenActionsMenu(e, row)}>
                        <MoreVertIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          rowsPerPageOptions={[20, 50, 100]}
          component="div"
          count={filteredRows.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(event, newPage) => setPage(newPage)}
          onRowsPerPageChange={(event) => {
            setRowsPerPage(parseInt(event.target.value, 10));
            setPage(0);
          }}
        />

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

        <Modal open={editModalOpen} onClose={handleCloseEditModal}>
          <Box sx={{ ...style, width: 800, maxHeight: '80vh', overflowY: 'auto' }}>
            <Typography variant="h6" component="h2">
              Edit Active Customer
            </Typography>
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

            <Button onClick={handleUpdateActiveCustomer} variant="contained" sx={{ mt: 2 }}>
              Save Changes
            </Button>
          </Box>
        </Modal>

        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleCloseActionsMenu}
        >
          <MenuItem onClick={handleOpenEditModal}>Edit</MenuItem>
          <MenuItem onClick={handleDelete}>Delete</MenuItem>
          <MenuItem onClick={handleOpenFinalPaymentModal}>Send Final Receipt</MenuItem>
        </Menu>
      </Container>
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