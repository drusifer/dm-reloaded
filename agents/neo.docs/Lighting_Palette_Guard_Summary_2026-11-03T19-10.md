# Viewport Palette Guard Correction

Trin independentQA caught arbitrary palette lengths accepted by viewportadapter. Added exact16 sourcecolor guard only to getViewportLightPalette; genericlightPalette remains arbitrarylength. ExistingdenseRGB validation handlesholes. Focused12tests across producer+independent suites pass19:10:32, lint/types19:10:42. First boundedcorrection; no fullsuite. Source stable and Make slot released for root/QA gate.
