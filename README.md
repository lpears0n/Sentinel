# Sentinel

Sentinel is a personal systems hub — a clean, read-only surface that shows the *state* of my infrastructure without exposing the internals behind it.

It acts as a front door to my public-facing services and a lightweight observability layer, designed to be informative without being intrusive. Sentinel is intentionally limited in scope, security-conscious by default, and built to evolve slowly over time.

This project is both a practical piece of infrastructure and a portfolio-grade example of how I design and deploy long-lived systems.

---

## What Sentinel Is (and Isn’t)

**Sentinel is:**
- A curated systems overview
- A single place to link public services
- A high-level view of infrastructure health
- A stable, read-only observability surface

**Sentinel is not:**
- A control panel
- An admin dashboard
- A monitoring system replacement
- A place where sensitive data lives

There are no write paths, no controls, and no internal identifiers exposed.

---

## High-Level Architecture

At a high level, Sentinel sits behind a reverse proxy and pulls in a small, sanitized set of system metrics.

