/** Hand-drawn 16px social sprites, scaled without smoothing to match the BIOS UI. */
const sprites = {
  linkedin: [
    '................',
    '.##############.',
    '.##############.',
    '.##..##########.',
    '.##..##########.',
    '.##############.',
    '.##..#..#...###.',
    '.##..#.......##.',
    '.##..#...##..##.',
    '.##..#..###..##.',
    '.##..#..###..##.',
    '.##..#..###..##.',
    '.##..#..###..##.',
    '.##############.',
    '.##############.',
    '................',
  ],
  github: [
    '................',
    '...##......##...',
    '...###....###...',
    '..############..',
    '..############..',
    '.##############.',
    '.###..####..###.',
    '.###..####..###.',
    '..############..',
    '...##########...',
    '.....######.....',
    '.##...####......',
    '..##.######.....',
    '...########.....',
    '.....######.....',
    '................',
  ],
};
export default function SocialIcon({ kind }: { kind:keyof typeof sprites }) {
  const pixels=sprites[kind].flatMap((row,y)=>row.split('').flatMap((pixel,x)=>pixel==='#'?[`M${x} ${y}h1v1h-1z`]:[])).join('');
  return <svg className="social-pixel-icon" viewBox="0 0 16 16" fill="currentColor" shapeRendering="crispEdges" aria-hidden="true"><path d={pixels}/></svg>;
}
