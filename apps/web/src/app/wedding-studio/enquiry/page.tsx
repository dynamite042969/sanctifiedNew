"use client";

import * as React from "react";
import { createClient } from "@supabase/supabase-js";
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Modal,
  Menu,
  IconButton,
  TablePagination,
} from "@mui/material";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { TimePicker } from "@mui/x-date-pickers/TimePicker";
import dayjs, { Dayjs } from "dayjs";
import MoreVertIcon from "@mui/icons-material/MoreVert";

const SUPABASE_URL = "https://taiwczeqmpyxtendwnpu.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRhaXdjemVxbXB5eHRlbmR3bnB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY4NjAyNDYsImV4cCI6MjA2MjQzNjI0Nn0.3LrZqyy-KC3-TwZEytoHzEyK3HG52U7vlwb2VAhsVX8";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const PDF_URL =
  "https://drive.google.com/file/d/18Sm8_Q_mg2yT1YHUh1JKTHlmXDwAyCpc/view?usp=drive_link";

interface CustomEvent {
  date: Dayjs | null;
  time: Dayjs | null;
  function: string;
  service: string;
  address: string;
}

interface Enquiry {
  id: number;
  created_at: string;
  name: string;
  phone: string;
  amount: number;
  package: string;
  date: string;
  status: string;
  custom_events: CustomEvent[] | null;
}

export default function EnquiryPage() {
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [packageSelection, setPackageSelection] = React.useState("");
  const [date, setDate] = React.useState<Dayjs | null>(null);
  const [customEvents, setCustomEvents] = React.useState<CustomEvent[]>([]);
  const [enquiries, setEnquiries] = React.useState<Enquiry[]>([]);
  const [selectedEnquiry, setSelectedEnquiry] = React.useState<Enquiry | null>(null);
  const [convertModalOpen, setConvertModalOpen] = React.useState(false);
  const [editModalOpen, setEditModalOpen] = React.useState(false);
  const [editDraft, setEditDraft] = React.useState<Partial<Enquiry>>({});
  const [advancePayment, setAdvancePayment] = React.useState("");
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");
  const [packageFilter, setPackageFilter] = React.useState("");
  const [dateFilter, setDateFilter] = React.useState<Dayjs | null>(null);
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(20);

  const loadEnquiries = async () => {
    const { data, error } = await supabase
      .from("wedding_enquiry")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) {
      setEnquiries(data as Enquiry[]);
    } else if (error) {
      console.error(error);
    }
  };

  React.useEffect(() => {
    loadEnquiries();
  }, []);

  const filteredEnquiries = React.useMemo(() => {
    return enquiries
      .filter((enquiry) => {
        const searchLower = searchQuery.toLowerCase();
        return (
          enquiry.name.toLowerCase().includes(searchLower) ||
          enquiry.phone.toLowerCase().includes(searchLower)
        );
      })
      .filter((enquiry) => (statusFilter ? enquiry.status === statusFilter : true))
      .filter((enquiry) => (packageFilter ? enquiry.package === packageFilter : true))
      .filter((enquiry) =>
        dateFilter ? dayjs(enquiry.date).isSame(dateFilter, "day") : true
      );
  }, [enquiries, searchQuery, statusFilter, packageFilter, dateFilter]);

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleAddEvent = () => {
    setCustomEvents([
      ...customEvents,
      { date: null, time: null, function: "", service: "", address: "" },
    ]);
  };

  const handleEventChange = (index: number, field: keyof CustomEvent, value: any) => {
    const newEvents = [...customEvents];
    newEvents[index] = { ...newEvents[index], [field]: value };
    setCustomEvents(newEvents);
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
    newEvents.push({
      date: null,
      time: null,
      function: "",
      service: "",
      address: "",
    });
    setEditDraft({ ...editDraft, custom_events: newEvents });
  };

  const handleSave = async () => {
    if (!name || !phone || !packageSelection || !amount || !date) {
      alert("Please fill all the required fields.");
      return;
    }

    if (packageSelection === "custom") {
      if (
        customEvents.some(
          (event) =>
            !event.date || !event.time || !event.function || !event.service || !event.address
        )
      ) {
        alert("Please fill all fields for each custom event.");
        return;
      }
    }

    const enquiryData = {
      name,
      phone,
      amount: Number(amount),
      package: packageSelection,
      date: date?.toISOString(),
      custom_events:
        packageSelection === "custom"
          ? customEvents.map((e) => ({
              ...e,
              date: e.date?.toISOString(),
              time: e.time?.toISOString(),
            }))
          : [],
    };

    const { error } = await supabase.from("wedding_enquiry").insert([enquiryData]);

    if (error) {
      console.error("Error inserting data:", error);
    } else {
      // Clear form
      setName("");
      setPhone("");
      setAmount("");
      setPackageSelection("");
      setDate(null);
      setCustomEvents([]);
      loadEnquiries();
    }
  };

  const handleOpenConvertModal = (enquiry: Enquiry) => {
    setSelectedEnquiry(enquiry);
    setConvertModalOpen(true);
  };

  const handleCloseConvertModal = () => {
    setSelectedEnquiry(null);
    setConvertModalOpen(false);
    setAdvancePayment("");
  };

  const handleConvertToBooking = async () => {
    if (!selectedEnquiry) return;

    const remainingAmount = selectedEnquiry.amount - Number(advancePayment);

    const { error: activeError } = await supabase.from("wedding_active").insert([
      {
        name: selectedEnquiry.name,
        phone: selectedEnquiry.phone,
        amount_total: selectedEnquiry.amount,
        advance_paid: Number(advancePayment),
        remaining_amount: remainingAmount,
        event_date: selectedEnquiry.date,
        status: "active",
        package: selectedEnquiry.package,
        custom_events: selectedEnquiry.custom_events,
      },
    ]);

    if (activeError) {
      console.error("Error creating active booking:", activeError);
      return;
    }

    const { error: enquiryError } = await supabase
      .from("wedding_enquiry")
      .update({ status: "active" })
      .eq("id", selectedEnquiry.id);

    if (enquiryError) {
      console.error("Error updating enquiry status:", enquiryError);
    } else {
      handleCloseConvertModal();
      loadEnquiries();
    }
  };

  const handleOpenActionsMenu = (
    event: React.MouseEvent<HTMLElement>,
    enquiry: Enquiry
  ) => {
    setAnchorEl(event.currentTarget);
    setSelectedEnquiry(enquiry);
  };

  const handleCloseActionsMenu = () => {
    setAnchorEl(null);
    setSelectedEnquiry(null);
  };

  const handleOpenEditModal = () => {
    if (!selectedEnquiry) return;
    setEditDraft(selectedEnquiry);
    setEditModalOpen(true);
    handleCloseActionsMenu();
  };

  const handleCloseEditModal = () => {
    setEditModalOpen(false);
    setEditDraft({});
  };

  const handleUpdateEnquiry = async () => {
    if (!editDraft.id) return;
    const { error } = await supabase
      .from("wedding_enquiry")
      .update(editDraft)
      .eq("id", editDraft.id);

    if (error) {
      console.error("Error updating enquiry:", error);
    } else {
      handleCloseEditModal();
      loadEnquiries();
    }
  };

  const handleDelete = async () => {
    if (!selectedEnquiry) return;
    const { error } = await supabase
      .from("wedding_enquiry")
      .delete()
      .eq("id", selectedEnquiry.id);
    if (error) {
      console.error("Error deleting enquiry:", error);
    } else {
      loadEnquiries();
    }
    handleCloseActionsMenu();
  };

  // 🔤 Use literal emoji to avoid encoding issues.
  const EMOJI_CAMERA = "📷";
  const EMOJI_POINTER = "👉";
  const EMOJI_CALENDAR = "📅";
  const EMOJI_CLOCK = "🕰️"; // includes VS16 to force emoji presentation
  const EMOJI_LOCATION = "📍";
  const EMOJI_RUPEE = "₹";

  const generateWhatsAppMessage = (enquiry: Enquiry) => {
    let eventsText = "";

    switch (enquiry.package) {
      case "custom":
        if (enquiry.custom_events) {
          eventsText = enquiry.custom_events
            .map((event) => {
              const dateStr = event.date ? dayjs(event.date).format("DD-MMM-YYYY") : "--";
              const timeStr = event.time ? dayjs(event.time).format("hh:mm A") : "--";
              const func = event.function || "--";
              const srv = event.service ? `(${event.service})` : "";
              const addr = event.address || "--";
              return `-----------------------------------------------
${EMOJI_POINTER} Event :- ${func} ${srv}
${EMOJI_CALENDAR} Date :- ${dateStr}
${EMOJI_CLOCK} Time :- ${timeStr}
${EMOJI_LOCATION} Address :- ${addr}
-----------------------------------------------`;
            })
            .join("\n");
        }
        break;

      case "premium":
      case "regular":
        const functions = [
          {
            name: "MEHENDI AT BRIDES HOME",
            date: "27-Oct-2024",
            time: "--",
            address: "TILHERI",
          },
          {
            name: "HALDI CEREMONY COMMON FOR BOTH SIDE",
            date: "28-Oct-2024",
            time: "--",
            address: "JABALPUR",
          },
          {
            name: "SANGEET CEREMONY SEPERATE TEAM FOR BOTH SIDE",
            date: "28-Oct-2024",
            time: "--",
            address: "JABALPUR",
          },
          { name: "WEDDING DAY", date: "29-Oct-2024", time: "--", address: "JABALPUR" },
        ];
        eventsText = functions
          .map(
            (func) => `-----------------------------------------------
${EMOJI_POINTER} Event :- ${func.name} 
${EMOJI_CALENDAR} Date :- ${func.date}
${EMOJI_CLOCK} Time :- ${func.time}
${EMOJI_LOCATION} Address :- ${func.address}
-----------------------------------------------`
          )
          .join("\n");
        break;

      default:
        break;
    }

    return `${EMOJI_CAMERA} Hi, you are successfully booked ORDER with us for following event's

${eventsText}
Advance payment received ${EMOJI_RUPEE} 1000.00
Pending Payment ${EMOJI_RUPEE} 74,000.00
Thanks for trusting our studio to be a part of your celebration. Regards,
Holy Ceremony Weddings
Gorakhpur
9827411116`;
  };

  const handleSendWhatsApp = () => {
    if (!selectedEnquiry) return;
    const message = generateWhatsAppMessage(selectedEnquiry);
    const whatsappUrl = `https://wa.me/${selectedEnquiry.phone}?text=${encodeURIComponent(
      message
    )}`;
    window.open(whatsappUrl, "_blank");
    handleCloseActionsMenu();
  };

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
            Customer Enquiry
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Capture new leads and enquiries for wedding shoots.
          </Typography>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
        <Card elevation={3} sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h5" fontWeight={600} gutterBottom>
              Add New Enquiry
            </Typography>
            <Box component="form" sx={{ mt: 2 }}>
              <TextField
                fullWidth
                label="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                margin="normal"
                required
                InputLabelProps={{
                  sx: {
                    "& .MuiInputLabel-asterisk": { color: "red" },
                  },
                }}
                sx={{ mt: 2, mb: 1 }}
              />
              <TextField
                fullWidth
                label="Phone (WhatsApp)"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                margin="normal"
                required
                InputLabelProps={{
                  sx: {
                    "& .MuiInputLabel-asterisk": { color: "red" },
                  },
                }}
                sx={{ mt: 2, mb: 1 }}
              />
              <FormControl fullWidth margin="normal" required sx={{ mt: 2, mb: 1 }}>
                <InputLabel
                  sx={{
                    "& .MuiInputLabel-asterisk": { color: "red" },
                  }}
                >
                  Package
                </InputLabel>
                <Select
                  value={packageSelection}
                  onChange={(e) => setPackageSelection(e.target.value)}
                  label="Package"
                >
                  <MenuItem value="regular">Regular Package</MenuItem>
                  <MenuItem value="premium">Premium Package</MenuItem>
                  <MenuItem value="custom">Custom Package</MenuItem>
                </Select>
              </FormControl>
              <TextField
                fullWidth
                label="Amount (₹)"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                margin="normal"
                required
                InputLabelProps={{
                  sx: {
                    "& .MuiInputLabel-asterisk": { color: "red" },
                  },
                }}
                sx={{ mt: 2, mb: 1 }}
              />
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DatePicker
                  label="Date"
                  value={date}
                  onChange={(newValue) => setDate(newValue)}
                  minDate={dayjs().add(1, "day")}
                  sx={{ mt: 2, mb: 1, width: "100%" }}
                  slotProps={{
                    textField: {
                      required: true,
                      InputLabelProps: {
                        sx: { "& .MuiInputLabel-asterisk": { color: "red" } },
                      },
                    },
                  }}
                />
              </LocalizationProvider>

              <Button variant="contained" size="large" onClick={handleSave} sx={{ mt: 2 }}>
                Save Enquiry
              </Button>

              {packageSelection === "custom" && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Custom Package Details
                  </Typography>
                  {customEvents.map((event, index) => (
                    <Box
                      key={index}
                      sx={{
                        display: "flex",
                        gap: 2,
                        mb: 2,
                        alignItems: "center",
                        flexWrap: "wrap",
                      }}
                    >
                      <LocalizationProvider dateAdapter={AdapterDayjs}>
                        <DatePicker
                          label="Event Date"
                          value={event.date}
                          onChange={(newValue) =>
                            handleEventChange(index, "date", newValue)
                          }
                        />
                        <TimePicker
                          label="Event Time"
                          value={event.time}
                          onChange={(newValue) =>
                            handleEventChange(index, "time", newValue)
                          }
                        />
                      </LocalizationProvider>
                      <TextField
                        label="Function"
                        value={event.function}
                        onChange={(e) =>
                          handleEventChange(index, "function", e.target.value)
                        }
                      />
                      <TextField
                        label="Service"
                        value={event.service}
                        onChange={(e) =>
                          handleEventChange(index, "service", e.target.value)
                        }
                      />
                      <TextField
                        label="Address"
                        value={event.address}
                        onChange={(e) =>
                          handleEventChange(index, "address", e.target.value)
                        }
                      />
                    </Box>
                  ))}
                  <Button onClick={handleAddEvent}>Add Event</Button>
                </Box>
              )}
            </Box>
          </CardContent>
        </Card>

        <Typography variant="h5" fontWeight={600} gutterBottom>
          Current Enquiries
        </Typography>
        <Box sx={{ display: "flex", gap: 2, mb: 2, flexWrap: "wrap" }}>
          <TextField
            label="Search by Name or Phone"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ flexGrow: 1, minWidth: 220 }}
          />
          <FormControl sx={{ minWidth: 120 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              label="Status"
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="enquiry">Enquiry</MenuItem>
              <MenuItem value="active">Active</MenuItem>
            </Select>
          </FormControl>
          <FormControl sx={{ minWidth: 120 }}>
            <InputLabel>Package</InputLabel>
            <Select
              value={packageFilter}
              onChange={(e) => setPackageFilter(e.target.value)}
              label="Package"
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="regular">Regular</MenuItem>
              <MenuItem value="premium">Premium</MenuItem>
              <MenuItem value="custom">Custom</MenuItem>
            </Select>
          </FormControl>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DatePicker
              label="Filter by Date"
              value={dateFilter}
              onChange={(newValue) => setDateFilter(newValue)}
            />
          </LocalizationProvider>
        </Box>
        <TableContainer component={Paper} elevation={3}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Phone</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Package</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Convert to Booking</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredEnquiries
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((enquiry) => (
                  <TableRow key={enquiry.id}>
                    <TableCell>{enquiry.name}</TableCell>
                    <TableCell>{enquiry.phone}</TableCell>
                    <TableCell>{dayjs(enquiry.date).format("DD/MM/YYYY")}</TableCell>
                    <TableCell>{enquiry.amount}</TableCell>
                    <TableCell>{enquiry.package}</TableCell>
                    <TableCell>{enquiry.status}</TableCell>
                    <TableCell>
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={() => handleOpenConvertModal(enquiry)}
                        disabled={enquiry.status === "active"}
                      >
                        Convert
                      </Button>
                    </TableCell>
                    <TableCell>
                      <IconButton onClick={(e) => handleOpenActionsMenu(e, enquiry)}>
                        <MoreVertIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
          <TablePagination
            rowsPerPageOptions={[5, 10, 20, 50]}
            component="div"
            count={filteredEnquiries.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </TableContainer>

        <Modal open={convertModalOpen} onClose={handleCloseConvertModal}>
          <Box sx={{ ...style, width: 400 }}>
            <Typography variant="h6" component="h2">
              Convert to Booking
            </Typography>
            <TextField
              fullWidth
              label="Advance Payment"
              type="number"
              value={advancePayment}
              onChange={(e) => setAdvancePayment(e.target.value)}
              margin="normal"
            />
            <Button onClick={handleConvertToBooking} variant="contained">
              Confirm
            </Button>
          </Box>
        </Modal>

        <Modal open={editModalOpen} onClose={handleCloseEditModal}>
          <Box sx={{ ...style, width: 800, maxHeight: "80vh", overflowY: "auto" }}>
            <Typography variant="h6" component="h2">
              Edit Enquiry
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
              label="Amount"
              type="number"
              value={editDraft.amount ?? ""}
              onChange={(e) =>
                setEditDraft({ ...editDraft, amount: Number(e.target.value) })
              }
              margin="normal"
            />
            <FormControl fullWidth margin="normal">
              <InputLabel>Package</InputLabel>
              <Select
                value={editDraft.package || ""}
                onChange={(e) =>
                  setEditDraft({ ...editDraft, package: e.target.value as string })
                }
                label="Package"
              >
                <MenuItem value="regular">Regular Package</MenuItem>
                <MenuItem value="premium">Premium Package</MenuItem>
                <MenuItem value="custom">Custom Package</MenuItem>
              </Select>
            </FormControl>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DatePicker
                label="Date"
                value={editDraft.date ? dayjs(editDraft.date) : null}
                onChange={(newValue) =>
                  setEditDraft({ ...editDraft, date: newValue?.toISOString() })
                }
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
                      flexWrap: "wrap",
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
                    <TextField
                      label="Address"
                      value={event.address}
                      onChange={(e) =>
                        handleEditEventChange(index, "address", e.target.value)
                      }
                    />
                  </Box>
                ))}
                <Button onClick={handleAddEventToDraft}>Add Event</Button>
              </Box>
            )}

            <Button onClick={handleUpdateEnquiry} variant="contained" sx={{ mt: 2 }}>
              Save Changes
            </Button>
          </Box>
        </Modal>

        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleCloseActionsMenu}>
          <MenuItem onClick={handleOpenEditModal}>Edit</MenuItem>
          <MenuItem onClick={handleDelete}>Delete</MenuItem>
          <MenuItem onClick={handleSendWhatsApp}>Send WhatsApp Receipt</MenuItem>
        </Menu>
      </Container>
    </main>
  );
}

const style = {
  position: "absolute" as const,
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: 400,
  bgcolor: "background.paper",
  border: "2px solid #000",
  boxShadow: 24,
  p: 4,
};
