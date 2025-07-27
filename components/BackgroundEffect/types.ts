export interface BackgroundEffectProps {
  paused?: boolean;
}

export interface BackgroundEffectWrapperProps extends BackgroundEffectProps {
  onEffectChange?: (effectName: string) => void;
  onEffectUpdate?: (effect: EffectComponent) => void;
}

export interface EffectComponent {
  name: string;
  component: React.ComponentType<BackgroundEffectProps>;
}