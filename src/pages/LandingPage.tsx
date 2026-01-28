import React from 'react';
import { Box, Button, Card, CardContent, Container, Stack, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  const handleLaunchDemo = () => {
    navigate('/demo');
  };

  return (
    <Container maxWidth="lg">
      {/* Hero section */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: 'center',
          justifyContent: 'space-between',
          py: { xs: 6, md: 10 },
          gap: 6,
        }}
      >
        <Box sx={{ flex: 1 }}>
          <Typography variant="overline" color="primary" sx={{ letterSpacing: '0.16em' }}>
            MT. BATULAO / PHILIPPINES
          </Typography>

          <Typography
            variant="h2"
            component="h1"
            sx={{ mt: 1, mb: 2, maxWidth: 600 }}
          >
            Explore mountains in 3D.
          </Typography>

          <Typography variant="h5" color="text.secondary" sx={{ mb: 4, maxWidth: 520 }}>
            Visualize hiking routes and play the climb timeline.
          </Typography>

          <Stack direction="row" spacing={2}>
            <Button
              variant="contained"
              size="large"
              color="primary"
              onClick={handleLaunchDemo}
            >
              Launch Demo
            </Button>
          </Stack>
        </Box>

        {/* Right hero visual placeholder (no actual 3D yet) */}
        <Box
          sx={{
            flex: 1,
            minHeight: 260,
            borderRadius: 4,
            bgcolor: 'background.paper',
            boxShadow: 4,
            p: 3,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <Typography variant="subtitle2" color="text.secondary">
            Mt. Batulao — Summit Trail
          </Typography>
          <Box
            sx={{
              flex: 1,
              borderRadius: 3,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'text.secondary',
              border: '1px dashed rgba(0,0,0,0.08)',
            }}
          >
            {/* TODO: replace with live 3D thumbnail or screenshot */}
            <Typography variant="body2">
              3D mountain preview placeholder
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Feature highlights */}
      <Box sx={{ pb: 8, display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' } }}>
        <Card elevation={2}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              3D Terrain
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Inspect Mt. Batulao&apos;s shape with an interactive Three.js scene,
              optimized for clarity over realism.
            </Typography>
          </CardContent>
        </Card>

        <Card elevation={2}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Route Visualization
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Follow the Summit Trail path with a highlighted line, tuned for
              readability and spatial context.
            </Typography>
          </CardContent>
        </Card>

        <Card elevation={2}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Timeline Playback
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Step through key moments of the climb or play the full ascent as a
              smooth camera animation.
            </Typography>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
};

