import { describe, expect, it } from "vitest";
import { decideIncidentAction } from "./decide-incident-action";

describe("decideIncidentAction", () => {
  it("does nothing on a single failure below the threshold", () => {
    const result = decideIncidentAction({
      newStatus: "DOWN",
      previousConsecutiveFailures: 0,
      hasOpenIncident: false,
      threshold: 3,
    });
    expect(result).toEqual({ action: "none", consecutiveFailures: 1 });
  });

  it("opens an incident exactly when the threshold is first crossed", () => {
    const result = decideIncidentAction({
      newStatus: "DOWN",
      previousConsecutiveFailures: 2,
      hasOpenIncident: false,
      threshold: 3,
    });
    expect(result).toEqual({ action: "open", consecutiveFailures: 3 });
  });

  it("does not open a second incident on further consecutive failures", () => {
    const result = decideIncidentAction({
      newStatus: "DOWN",
      previousConsecutiveFailures: 3,
      hasOpenIncident: true,
      threshold: 3,
    });
    expect(result).toEqual({ action: "none", consecutiveFailures: 4 });
  });

  it("resolves an open incident on recovery", () => {
    const result = decideIncidentAction({
      newStatus: "UP",
      previousConsecutiveFailures: 5,
      hasOpenIncident: true,
      threshold: 3,
    });
    expect(result).toEqual({ action: "resolve", consecutiveFailures: 0 });
  });

  it("does nothing on a recovery when there was no open incident", () => {
    const result = decideIncidentAction({
      newStatus: "UP",
      previousConsecutiveFailures: 1,
      hasOpenIncident: false,
      threshold: 3,
    });
    expect(result).toEqual({ action: "none", consecutiveFailures: 0 });
  });

  it("resets the counter to zero on any UP, not just when resolving", () => {
    const result = decideIncidentAction({
      newStatus: "UP",
      previousConsecutiveFailures: 0,
      hasOpenIncident: false,
      threshold: 3,
    });
    expect(result).toEqual({ action: "none", consecutiveFailures: 0 });
  });

  it("keeps counting failures while an incident is already open (fail-fail-recover)", () => {
    const first = decideIncidentAction({
      newStatus: "DOWN",
      previousConsecutiveFailures: 0,
      hasOpenIncident: false,
    });
    const second = decideIncidentAction({
      newStatus: "DOWN",
      previousConsecutiveFailures: first.consecutiveFailures,
      hasOpenIncident: false,
    });
    const third = decideIncidentAction({
      newStatus: "DOWN",
      previousConsecutiveFailures: second.consecutiveFailures,
      hasOpenIncident: false,
    });
    expect(third).toEqual({ action: "open", consecutiveFailures: 3 });

    const recovered = decideIncidentAction({
      newStatus: "UP",
      previousConsecutiveFailures: third.consecutiveFailures,
      hasOpenIncident: true,
    });
    expect(recovered).toEqual({ action: "resolve", consecutiveFailures: 0 });
  });

  it("never opens a second incident while one is already open (fail-recover-fail)", () => {
    const belowThreshold = decideIncidentAction({
      newStatus: "DOWN",
      previousConsecutiveFailures: 1,
      hasOpenIncident: true,
    });
    expect(belowThreshold.action).toBe("none");
  });
});
