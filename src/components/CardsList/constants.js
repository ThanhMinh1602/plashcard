import {
  FiCircle,
  FiMinus,
  FiPenTool,
  FiSquare,
} from 'react-icons/fi';
import { BsEraser } from 'react-icons/bs';
import { GiFeather } from 'react-icons/gi';
import { MdBrush } from 'react-icons/md';
import { PiPencilSimpleLineBold } from 'react-icons/pi';
import { RiMarkPenLine } from 'react-icons/ri';

export const TOOL_LIST = [
  { id: 'brush', icon: MdBrush, label: 'Brush' },
  { id: 'eraser', icon: BsEraser, label: 'Eraser' },
  { id: 'line', icon: FiMinus, label: 'Line' },
  { id: 'rectangle', icon: FiSquare, label: 'Rectangle' },
  { id: 'circle', icon: FiCircle, label: 'Circle' },
];

export const BRUSH_TYPES = [
  { id: 'pen', icon: FiPenTool, label: 'Pen' },
  { id: 'pencil', icon: PiPencilSimpleLineBold, label: 'Pencil' },
  { id: 'marker', icon: RiMarkPenLine, label: 'Marker' },
  { id: 'calligraphy', icon: GiFeather, label: 'Calligraphy' },
];

export const DEFAULT_TOOLBOX = {
  tool: 'brush',
  brushType: 'pen',
  color: '#0f172a',
  size: 4,
  opacity: 1,
};

export const DEFAULT_STATUS = {
  canUndo: false,
  canRedo: false,
};

export const FRONT_PAPER_COLOR = '#f0f9ff';
export const BACK_PAPER_COLOR = '#fdf2f8';

export const createLocalCard = (card = {}) => ({
  localId:
    card.localId ||
    `local-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
  id: card.id || null,
  front: card.front || '',
  back: card.back || '',
});

export const cn = (...classes) => classes.filter(Boolean).join(' ');