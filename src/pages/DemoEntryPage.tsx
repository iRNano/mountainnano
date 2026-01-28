import React from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';

export const DemoEntryPage: React.FC = () => {
  const navigate = useNavigate();

  const handleStartVisualization = () => {
    navigate('/visualization');
  };

  return (
    <Box
      sx={{
        maxWidth: 720,
        mx: 'auto',
        py: { xs: 4, md: 6 },
      }}
    >
      <Stack spacing={3}>
        {/* Header */}
        <Stack spacing={1}>
          <Typography variant="overline" color="primary" sx={{ letterSpacing: '0.16em' }}>
            DEMO SETUP
          </Typography>
          <Typography variant="h4" component="h1">
            Mt. Batulao — Summit Trail
          </Typography>
          <Typography variant="body1" color="text.secondary">
            A focused single-mountain demo showcasing 3D terrain, a highlighted hiking
            route, and a simple climb timeline. All data is static and hardcoded for
            this visualization.
          </Typography>
        </Stack>

        {/* Mountain info card */}
        <Card elevation={3}>
          <CardContent>
            <Stack spacing={2}>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                alignItems={{ xs: 'flex-start', sm: 'center' }}
                justifyContent="space-between"
                spacing={2}
              >
                <Stack spacing={0.5}>
                  <Typography variant="h6">Mountain details</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Static configuration for this demo. One mountain, one trail, one
                    timeline — optimized for clarity over flexibility.
                  </Typography>
                </Stack>

                <Stack direction="row" spacing={1} flexWrap="wrap">
                  <Chip size="small" label="Philippines" />
                  <Chip size="small" label="Single dataset" />
                  <Chip size="small" label="Frontend-only" />
                </Stack>
              </Stack>

              <Divider />

              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={3}
                sx={{ pt: 1 }}
              >
                <Stack spacing={0.5} sx={{ minWidth: 160 }}>
                  <Typography variant="overline" color="text.secondary">
                    Mountain
                  </Typography>
                  <Typography variant="body1">Mt. Batulao</Typography>
                </Stack>

                <Stack spacing={0.5} sx={{ minWidth: 160 }}>
                  <Typography variant="overline" color="text.secondary">
                    Elevation
                  </Typography>
                  <Typography variant="body1">811 MASL</Typography>
                </Stack>

                <Stack spacing={0.5} sx={{ minWidth: 160 }}>
                  <Typography variant="overline" color="text.secondary">
                    Difficulty
                  </Typography>
                  <Typography variant="body1">Moderate</Typography>
                </Stack>
              </Stack>

              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={3}
                sx={{ pt: 1 }}
              >
                <Stack spacing={0.5} sx={{ minWidth: 160 }}>
                  <Typography variant="overline" color="text.secondary">
                    Available route
                  </Typography>
                  <Typography variant="body1">Summit Trail</Typography>
                </Stack>

                <Stack spacing={0.5}>
                  <Typography variant="overline" color="text.secondary">
                    What you&apos;ll see
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    A highlighted route on a simple 3D terrain, plus a short timeline of
                    climb checkpoints driving camera movements along the trail.
                  </Typography>
                </Stack>
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        {/* Call to action */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: { xs: 'stretch', sm: 'center' },
            justifyContent: 'space-between',
            gap: 2,
            pt: 1,
          }}
        >
          <Typography variant="body2" color="text.secondary">
            When you&apos;re ready, start the visualization to open the 3D scene with a
            sidebar for the route and climb timeline.
          </Typography>

          <Button
            variant="contained"
            size="large"
            color="primary"
            onClick={handleStartVisualization}
          >
            Start Visualization
          </Button>
        </Box>
      </Stack>
    </Box>
  );
};

