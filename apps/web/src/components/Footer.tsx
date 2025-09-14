"use client";

import * as React from "react";
import { Container, Box, Typography, Link as MuiLink } from "@mui/material";

export default function Footer() {
  return (
    <Box component="footer" sx={{ borderTop: (t) => `1px solid ${t.palette.divider}`, py: 3, mt: 6 }}>
      <Container maxWidth="lg" sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
        <Typography variant="body2" color="text.secondary">
          © {new Date().getFullYear()} Sanctified Studios
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Built with <MuiLink href="https://nextjs.org" target="_blank" rel="noreferrer">Next.js</MuiLink> &{" "}
          <MuiLink href="https://mui.com" target="_blank" rel="noreferrer">MUI</MuiLink>
        </Typography>
      </Container>
    </Box>
  );
}
