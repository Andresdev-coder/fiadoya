export default function Soon({ title }: { title: string }) {
  return (
    <div className="py-16 text-center">
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="mt-2 text-slate-500">Esta pantalla se construye en el próximo paso.</p>
    </div>
  );
}