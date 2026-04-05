export const STAGES = [
  'Ideas',
  'Half Baked',
  'Open Mics',
  'Working',
  'Shows',
  'Today',
  'Uploaded',
  'Trashed',
  'Not working yet',
];

export const STAGE_COLORS = {
  Ideas: {
    pill: '#4f7f64',
    column: '#20382c',
    card: '#263b30',
    border: '#355442',
  },
  'Half Baked': {
    pill: '#af8d41',
    column: '#393224',
    card: '#433928',
    border: '#5a4a31',
  },
  'Open Mics': {
    pill: '#b26767',
    column: '#3d2628',
    card: '#4a2c2f',
    border: '#694041',
  },
  Working: {
    pill: '#9875d1',
    column: '#2f2744',
    card: '#382f4f',
    border: '#4a3f6a',
  },
  Shows: {
    pill: '#6f8fd8',
    column: '#233149',
    card: '#2c3b57',
    border: '#3f557f',
  },
  Today: {
    pill: '#4f9d8b',
    column: '#1f3835',
    card: '#264541',
    border: '#35605a',
  },
  Uploaded: {
    pill: '#5b81a8',
    column: '#24313d',
    card: '#2d3b48',
    border: '#425768',
  },
  Trashed: {
    pill: '#8d6f63',
    column: '#372b28',
    card: '#44322f',
    border: '#5f4741',
  },
  'Not working yet': {
    pill: '#7a7f88',
    column: '#2a2c31',
    card: '#34373d',
    border: '#4b4f58',
  },
};

const STAGE_ALIASES = {
  'Open mics': 'Open Mics',
  'Open Mics': 'Open Mics',
  ideas: 'Ideas',
  'half baked': 'Half Baked',
  shows: 'Shows',
  uploaded: 'Uploaded',
  trashed: 'Trashed',
  'not working yet': 'Not working yet',
  working: 'Working',
  today: 'Today',
};

export const canonicalizeStage = (stage) => {
  const trimmed = String(stage || '').trim();
  return STAGE_ALIASES[trimmed] || STAGE_ALIASES[trimmed.toLowerCase()] || STAGES[0];
};
