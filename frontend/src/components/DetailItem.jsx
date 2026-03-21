export default function DetailItem({ label, value, labelLang = "en", as = "article" }) {
  const Component = as;

  return (
    <Component className="detail-item">
      <span lang={labelLang}>{label}</span>
      <strong>{value}</strong>
    </Component>
  );
}
