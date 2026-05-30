"use client"

import { useEffect } from "react"

export function FixPointerError() {
    useEffect(() => {
        if (typeof window !== "undefined" && typeof Element !== "undefined") {
            const originalReleasePointerCapture = Element.prototype.releasePointerCapture
            Element.prototype.releasePointerCapture = function (pointerId) {
                try {
                    originalReleasePointerCapture.call(this, pointerId)
                } catch (error) {
                    if (error instanceof DOMException && error.name === "NotFoundError") {
                        // Ignore NotFoundError: Failed to execute 'releasePointerCapture' on 'Element': No active pointer with the given id is found.
                        return
                    }
                    throw error
                }
            }
        }
    }, [])

    return null
}
