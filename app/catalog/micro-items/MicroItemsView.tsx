"use client";

import { PageHeader } from "../components/PageHeader";
import { MicroItemsLibraryPanel } from "../components/MicroItemsLibraryPanel";
import { useCatalog } from "../CatalogProvider";

export function MicroItemsView() {
  const { microItems, call } = useCatalog();

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <PageHeader title="Micro-Items">
        The priced leaves of the rate book — a door, a m² of wall, a beam. Every sub-item, macro-item and project that
        assembles a micro-item picks up its rate from here.
      </PageHeader>

      <MicroItemsLibraryPanel
        microItems={microItems}
        onCreate={(spec) => call("/api/catalog/micro-items", "POST", { ...spec, rates: { basic: 0, standard: 0, premium: 0 } })}
        onChange={(id, patch) => call(`/api/catalog/micro-items/${id}`, "PATCH", patch)}
        onDelete={(id) => call(`/api/catalog/micro-items/${id}`, "DELETE")}
      />
    </div>
  );
}
