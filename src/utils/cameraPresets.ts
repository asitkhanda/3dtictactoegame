export type CameraPresetId =
  | 'default'
  | 'top'
  | 'front'
  | 'back'
  | 'right'
  | 'left'
  | 'iso';

export interface CameraPreset {
  id: CameraPresetId;
  label: string;
  shortLabel: string;
  rotation: { x: number; y: number };
}

export const CAMERA_PRESETS: Record<CameraPresetId, CameraPreset> = {
  default: {
    id: 'default',
    label: 'Home view',
    shortLabel: '⌂',
    rotation: { x: -25, y: 45 },
  },
  top: {
    id: 'top',
    label: 'Top view',
    shortLabel: 'T',
    rotation: { x: -90, y: 0 },
  },
  front: {
    id: 'front',
    label: 'Front view',
    shortLabel: 'F',
    rotation: { x: 0, y: 0 },
  },
  back: {
    id: 'back',
    label: 'Back view',
    shortLabel: 'B',
    rotation: { x: 0, y: 180 },
  },
  right: {
    id: 'right',
    label: 'Right view',
    shortLabel: 'R',
    rotation: { x: 0, y: 90 },
  },
  left: {
    id: 'left',
    label: 'Left view',
    shortLabel: 'L',
    rotation: { x: 0, y: -90 },
  },
  iso: {
    id: 'iso',
    label: 'Isometric view',
    shortLabel: 'I',
    rotation: { x: -35, y: 45 },
  },
};

export const CAMERA_PRESET_ORDER: CameraPresetId[] = [
  'top',
  'front',
  'right',
  'back',
  'left',
  'iso',
  'default',
];

export const PRESET_TRANSITION_MS = 300;
