import React, { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Divider,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import timelineData from '../data/mt-batulao/timeline.json';
import { MountainScene, type TimelineEntry } from '../visualization/MountainScene';

export const VisualizationPage: React.FC = () => {
  const timeline = useMemo(() => timelineData as TimelineEntry[], []);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const handleSelectStep = (index: number) => {
    setActiveIndex(index);
    setIsPlaying(false); // selecting a step pauses playback for precise inspection
  };

  const handleTogglePlay = () => {
    setIsPlaying((prev) => !prev);
  };

  const handleAutoAdvance = (nextIndex: number) => {
    if (!isPlaying) return;
    if (nextIndex >= timeline.length) {
      setIsPlaying(false);
      return;
    }
    setActiveIndex(nextIndex);
  };

  return (
    <Box
      sx={{
        display: 'flex',
        height: 'calc(100vh - 80px)',
        gap: 2,
      }}
    >
      {/* Sidebar: route + timeline */}
      <Box
        sx={{
          width: 320,
          flexShrink: 0,
          bgcolor: 'background.paper',
          borderRadius: 3,
          boxShadow: 3,
          p: 2,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        <Stack spacing={0.5}>
          <Typography variant="overline" color="primary" sx={{ letterSpacing: '0.16em' }}>
            ROUTE
          </Typography>
          <Typography variant="h6">Mt. Batulao — Summit Trail</Typography>
          <Typography variant="body2" color="text.secondary">
            One fixed route and a small set of timeline checkpoints. Use the list below
            to jump to key moments, or press play to follow the climb.
          </Typography>
        </Stack>

        <Divider />

        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          justifyContent="space-between"
        >
          <Typography variant="subtitle2">Climb timeline</Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            <IconButton
              size="small"
              color="primary"
              onClick={handleTogglePlay}
              aria-label={isPlaying ? 'Pause playback' : 'Play playback'}
            >
              {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
            </IconButton>
            <Button
              size="small"
              onClick={() => setActiveIndex(0)}
              disabled={activeIndex === 0}
            >
              Reset
            </Button>
          </Stack>
        </Stack>

        <List
          dense
          sx={{
            flex: 1,
            overflowY: 'auto',
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          {timeline.map((entry, index) => (
            <ListItemButton
              key={entry.label}
              selected={index === activeIndex}
              onClick={() => handleSelectStep(index)}
            >
              <ListItemText
                primary={
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2">{entry.label}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {entry.time}
                    </Typography>
                  </Stack>
                }
              />
            </ListItemButton>
          ))}
        </List>
      </Box>

      {/* Main 3D canvas area */}
      <Box
        sx={{
          flex: 1,
          borderRadius: 3,
          overflow: 'hidden',
          boxShadow: 3,
          bgcolor: '#e3f2fd',
        }}
      >
        <MountainScene
          activeIndex={activeIndex}
          isPlaying={isPlaying}
          onStepAutoAdvance={handleAutoAdvance}
        />
      </Box>
    </Box>
  );
};

