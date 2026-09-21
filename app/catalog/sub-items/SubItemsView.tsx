"use client";

import { PageHeader } from "../components/PageHeader";
import { SubItemsLibraryPanel } from "../components/SubItemsLibraryPanel";
import { useCatalog } from "../CatalogProvider";

export function SubItemsView() {
  const { subItems, microItems, call } = useCatalog();

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <PageHeader title="Sub-Items">
        Reusable makeup groups, each assembled from existing micro-items at its own quantity. One sub-item can be
        assembled into any number of main-item macro-items — edit it here once and all of them recompute.
      </PageHeader>

      <SubItemsLibraryPanel
        subItems={subItems}
        microItems={microItems}
        onCreate={(name) => call("/api/catalog/sub-items", "POST", { name })}
        onRename={(id, name) => call(`/api/catalog/sub-items/${id}`, "PATCH", { name })}
        onDelete={(id) => call(`/api/catalog/sub-items/${id}`, "DELETE")}
        onChangeLabour={(id, labour) => call(`/api/catalog/sub-items/${id}`, "PATCH", { labour })}
        onAssembleMicroItem={(subItemId, microItemId, quantity) => call(`/api/catalog/sub-items/${subItemId}/components`, "POST", { microItemId, quantity })}
        onChangeComponentQuantity={(joinId, quantity) => call(`/api/catalog/sub-item-components/${joinId}`, "PATCH", { quantity })}
        onRemoveComponent={(joinId) => call(`/api/catalog/sub-item-components/${joinId}`, "DELETE")}
      />
    </div>
  );
}
