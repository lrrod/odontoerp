import { PageHeader, Panel } from "./AppShell";

export function ComingSoon({ title }: { title: string }) {
  return (
    <>
      <PageHeader title={title} />
      <main className="p-6">
        <Panel>
          <p className="text-sm text-muted-foreground">
            O módulo <strong className="text-foreground">{title}</strong> está em construção e será liberado na próxima fase.
          </p>
        </Panel>
      </main>
    </>
  );
}
