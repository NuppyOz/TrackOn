export function portalFecha(value: string | null) {
    return value && Number.isFinite(new Date(value).getTime())
        ? new Intl.DateTimeFormat("es-NI", { dateStyle: "medium", timeZone: "America/Managua" }).format(new Date(value))
        : "—";
}
