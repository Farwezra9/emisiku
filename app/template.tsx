// Simpan sebagai: app/template.tsx (sejajar dengan layout.tsx)
//
// PENTING: fill-mode memakai "backwards", bukan "both"/"forwards".
// Dengan "both", transform dari keyframe terakhir tetap menempel di elemen,
// dan elemen `position: fixed` (modal, toast) di dalamnya jadi tidak lagi
// menempel ke layar. Dengan "backwards", transform hilang setelah animasi selesai.

const css = `
@keyframes page-in {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: none; }
}
@keyframes page-fade {
  from { opacity: 0; }
  to   { opacity: 1; }
}
.page-enter {
  animation: page-in 500ms cubic-bezier(0.22, 1, 0.36, 1) backwards;
}
@media (prefers-reduced-motion: reduce) {
  .page-enter { animation: page-fade 300ms ease-out backwards; }
}
`;

export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{css}</style>
      <div className="page-enter flex flex-1 flex-col">{children}</div>
    </>
  );
}