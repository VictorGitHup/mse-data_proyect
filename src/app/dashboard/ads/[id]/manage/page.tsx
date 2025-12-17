// Placeholder for managing a specific ad.
// This page will be developed later.

export default function ManageAdPage({ params }: { params: { id: string } }) {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold">Gestionar Anuncio</h1>
      <p className="text-muted-foreground">Gestionando el anuncio con ID: {params.id}</p>
    </div>
  );
}
