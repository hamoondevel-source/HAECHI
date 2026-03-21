export default function InspectorSection({
  title,
  children,
  className = "unity-inspector-section",
  headerClassName = "unity-inspector-section-head",
  bodyClassName = "unity-inspector-section-body"
}) {
  return (
    <section className={className}>
      <div className={headerClassName}>{title}</div>
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}
