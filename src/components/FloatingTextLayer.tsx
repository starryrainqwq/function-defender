import { FloatingText } from '../hooks/useFloatingTexts';

export interface FloatingTextLayerProps {
  texts: FloatingText[];
}

export function FloatingTextLayer(props: FloatingTextLayerProps): React.JSX.Element {
  const { texts } = props;

  return (
    <div
      className="absolute inset-0 pointer-events-none z-[25]"
    >
      {texts.map((text) => (
        <div
          key={text.id}
          className="fx-floating-text"
          style={{
            left: text.x,
            top: text.y,
            color: text.color,
            transform: `translate(-50%, -50%) scale(${text.scale})`,
          }}
        >
          <span className="fx-inner">{text.text}</span>
        </div>
      ))}
    </div>
  );
}
