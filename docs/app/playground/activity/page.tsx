import { getProtocolState } from "@/lib/indexer/protocol-state";
import { ActivityFeed } from "@/components/playground/ActivityFeed";
import { EmptyProtocol } from "@/components/playground/EmptyProtocol";

export const dynamic = "force-dynamic";

export default async function ActivityPage() {
  const state = await getProtocolState();

  if (state.activity.length === 0) return <EmptyProtocol />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Protocol Activity</h1>
        <p className="text-fd-muted-foreground mt-1">
          {state.activity.length} events from contract logs and HCS consensus messages
        </p>
      </div>

      <ActivityFeed events={state.activity} maxItems={100} showFilters />
    </div>
  );
}
