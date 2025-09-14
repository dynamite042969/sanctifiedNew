"use client";

import * as React from "react";
import Link from "next/link";
import {
  Box,
  Container,
  Typography,
  Button,
  Card,
  CardContent,
} from "@mui/material";
import Grid from "@mui/material/Unstable_Grid2";

export default function WeddingStudioPage() {
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
            Wedding Studio
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage enquiries and keep track of your active customers.
          </Typography>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
        <Grid container spacing={3}>
          <Grid xs={12} sm={6}>
            <Card elevation={3} sx={{ height: "100%" }}>
              <CardContent>
                <Typography variant="h5" fontWeight={600} gutterBottom>
                  Customer Enquiry
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Capture new leads and enquiries for wedding shoots.
                </Typography>
                <Button component={Link} href="/wedding-studio/enquiry" variant="contained" size="large">
                  Go to Enquiry
                </Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid xs={12} sm={6}>
            <Card elevation={3} sx={{ height: "100%" }}>
              <CardContent>
                <Typography variant="h5" fontWeight={600} gutterBottom>
                  Active Customers
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  View and manage ongoing wedding studio customers.
                </Typography>
                <Button component={Link} href="/wedding-studio/active" variant="outlined" size="large">
                  View Active
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </main>
  );
}
