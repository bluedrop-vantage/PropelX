// Educational callout required by spec §4.2 when a crew preset is selected.

export function CrewedCallout() {
  return (
    <aside className="crewed-callout" role="note">
      <strong>Why is “2 astronauts” 9,500 kg, not 160 kg?</strong>
      <p>
        The payload here is the whole crewed vehicle: the pressurized capsule, life support,
        heat shield, parachutes, and launch-abort system — everything that keeps a human alive
        from ignition through splashdown. That’s why crewed payloads start near 10 tonnes.
      </p>
    </aside>
  );
}
