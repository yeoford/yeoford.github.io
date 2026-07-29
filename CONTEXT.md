# Yeoford Website Domain

## Glossary

### Village Voice Issue

A published edition of the Yeoford Village Voice, identified by its Issue
number and Publication Month. Each Village Voice Issue has one canonical Issue
PDF and may have multiple Derived Assets.

### Issue ID

The stable public identifier for a Village Voice Issue. It retains the legacy
`newsletter-YEAR-ZERO_BASED_MONTH-ISSUE` format and identifies Archive routes
and Derived Assets.

_Avoid_: Slug

### Issue PDF

The canonical PDF document for a Village Voice Issue. Issue PDFs are committed
to the repository and are the source from which newsletter metadata, cover
images, and public PDF copies are derived. An Issue PDF is optimized without
changing its published content or extractability.

### Publication Month

The calendar month in which a Village Voice Issue is published, represented as
timezone-independent `YYYY-MM` data. It is a month, not a timestamp or an
instant in time.

### Derived Asset

A deterministic, replaceable output generated from an Issue PDF. Derived
Assets include newsletter metadata, cover images, and public PDF copies. A
Derived Asset is not a source of truth.

### Latest Issue

The Village Voice Issue with the greatest Publication Month. Latest Issue is a
view over the Archive, not a separate collection.

### Archive

The complete collection of published Village Voice Issues, including the
Latest Issue, ordered by Publication Month.

### PDF Reader

The visitor-facing control that displays an Issue PDF in the website and lets a
visitor move between its pages.

### Map Fallback

The visible OpenStreetMap link shown when the interactive Yeoford map cannot
load its external map data.

### Community Hall Calendar

The visitor-facing schedule of events and availability for Yeoford Community
Hall, currently provided by an embedded Google Calendar.
