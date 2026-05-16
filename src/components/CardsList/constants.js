import { FiMove, FiPenTool } from 'react-icons/fi';
import { BsEraser } from 'react-icons/bs';
import { GiFeather } from 'react-icons/gi';
import { MdBrush } from 'react-icons/md';
import { PiPencilSimpleLineBold } from 'react-icons/pi';
import { RiMarkPenLine } from 'react-icons/ri';
import { DEFAULT_CARD_BACKGROUND_PAIR_ID } from '../../utils/cardBackgrounds';

export const TOOL_LIST = [
  { id: 'eraser', icon: BsEraser, label: 'Eraser' },
  { id: 'select', icon: FiMove, label: 'Move' },
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
  // Xóa trường color: '#0f172a' cũ
  brushColors: {
    pen: '#0f172a',        // Màu đen xám cho bút bi
    pencil: '#64748b',     // Màu chì cho bút chì
    marker: '#eab308',     // Màu vàng cho bút highlight
    calligraphy: '#be185d',// Màu hồng đậm cho bút thư pháp
  },
  brushSizes: {
    pen: 4,
    pencil: 2,
    marker: 20,
    calligraphy: 10,
  },
  eraserSize: 20,
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
  frontBase: card.frontBase || null,
  backBase: card.backBase || null,
  frontData: card.frontData || null,
  backData: card.backData || null,
  backgroundPairId:
    card.backgroundPairId || DEFAULT_CARD_BACKGROUND_PAIR_ID,
});

export const cn = (...classes) => classes.filter(Boolean).join(' ');
