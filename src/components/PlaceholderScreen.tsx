interface PlaceholderScreenProps {
  title: string;
  description?: string;
}

export function PlaceholderScreen({ title, description = '準備中' }: PlaceholderScreenProps) {
  return (
    <section className="screen screen-placeholder">
      <h1>{title}</h1>
      <p className="muted">{description}</p>
    </section>
  );
}
