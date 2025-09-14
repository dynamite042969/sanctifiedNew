"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { Container, Card, CardActionArea, CardContent, Typography } from "@mui/material";
import Grid from "@mui/material/Unstable_Grid2";
import ChildCareIcon from "@mui/icons-material/ChildCare";
import FavoriteIcon from "@mui/icons-material/Favorite";
import EventIcon from "@mui/icons-material/Event";
import GroupIcon from "@mui/icons-material/Group";
import logo from "../assets/logo.png";

type Tile = {
  title: string;
  href: string;
  Icon: React.ElementType;
  description: string;
};

const tiles: Tile[] = [
  { title: "Baby Studio", href: "/baby-studio", Icon: ChildCareIcon, description: "Capture baby milestones" },
  { title: "Wedding Studio", href: "/wedding-studio", Icon: FavoriteIcon, description: "Plan and manage weddings" },
  { title: "Events", href: "/events", Icon: EventIcon, description: "Create & organize events" },
  { title: "Team Management", href: "/team", Icon: GroupIcon, description: "Manage photographers & staff" },
];

export default function HomePage() {
  return (
    <Container maxWidth="lg">
      <Image src={logo} alt="Sanctified Studios Logo" width={100} height={100} style={{ margin: "auto" }} />
      <Typography variant="h3" fontWeight={800} textAlign="center" mb={2}>
        Welcome to Sanctified Studios
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" textAlign="center" mb={6}>
        Choose a workspace to get started
      </Typography>

      <Grid container spacing={3}>
        {tiles.map(({ title, href, Icon, description }) => (
          <Grid key={title} xs={12} sm={6} md={3}>
            <Card
              elevation={3}
              sx={{
                height: "100%",
                borderRadius: 3,
                overflow: "hidden",
                transition: "transform .15s ease, box-shadow .15s ease",
                "&:hover": { transform: "translateY(-2px)", boxShadow: 6 },
              }}
            >
              <CardActionArea component={Link} href={href} sx={{ height: "100%", p: 2 }}>
                <CardContent
                  sx={{ display: "grid", placeItems: "center", gap: 1.5, textAlign: "center", py: 5 }}
                >
                  <Icon sx={{ fontSize: 48, color: "primary.main" }} />
                  <Typography variant="h6" fontWeight={700}>
                    {title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {description}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
}
