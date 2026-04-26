import { Bookmarks } from "./Bookmarks";
import { MeasureTool } from "./MeasureTool";
import { EventTicker } from "./EventTicker";

export function BottomBar() {
  return (
    <div className="hairline-t flex flex-col bg-ink-900/95">
      <div className="hairline-b flex items-center divide-x divide-ink-600">
        <MeasureTool />
        <Bookmarks />
      </div>
      <EventTicker />
    </div>
  );
}
