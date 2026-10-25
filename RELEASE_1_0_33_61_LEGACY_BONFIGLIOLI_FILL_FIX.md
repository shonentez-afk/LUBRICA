# LUBRICA 1.0.33.61 — Legacy Bonfiglioli Fill Fix

## Purpose
The installed Bonfiglioli fleet is treated as older-generation equipment. When a historical Bonfiglioli lubricant-fill table contains a value for the exact size/stage and mounting position, LUBRICA now uses that legacy reference fill instead of leaving the working volume undefined or substituting a newer product-card value.

## Legacy reference values activated for the current fleet
- A20 2: 2.3 L for B3/B6/B7/B8/VA/VB.
- A41 2: B3 3.8; B6 3.1; B7 3.0; B8 4.0; VA 5.3; VB 3.3 L.
- A41 3: B3 4.6; B6 3.9; B7 3.8; B8 4.8; VA 6.1; VB 4.0 L.
- A50 3: B3 5.1; B6 8.1; B7 4.7; B8 8.4; VA 11; VB 9.2 L.
- C31 2 P: B3/B6/B7/B8 1.4; V5/V6 1.5 L.
- C41 2 P: B3 2.2; B6 2.0; B7 2.1; B8 1.9; V5 2.7; V6 3.4 L.
- C41 2 U/UF: B5 2.2; B51 2.0; B53 2.1; B52 1.9; V1 2.7; V3 3.4 L.
- C41 3 P: B3 2.1; B6 1.9; B7 2.1; B8 1.9; V5 2.6; V6 3.2 L.
- C51 2 P: B3 3.1; B6 3.0; B7 3.1; B8 3.0; V5 4.3; V6 5.0 L.
- C51 3 P: B3 3.0; B6 2.8; B7 3.1; B8 3.0; V5 4.1; V6 4.9 L.
- C61 2 P: B3 4.2; B6 4.0; B7 4.2; B8 4.1; V5 6.0; V6 6.7 L.
- F60 3: H1 14; H2 11; H3 7.9; H4 11; H5 15; H6 11 L.

## Current-fleet consequences
- C412/P 1:25 B3 PAM100 now resolves to 2.2 L.
- C412/P 1:31.4 B6 PAM100 now resolves to 2.0 L.
- C412/P B7 current-fleet units resolve to 2.1 L.
- C413/P 1:31.2 B6 resolves to 1.9 L.
- A202/UH30 ... VB resolves to 2.3 L.
- A412/NH and A412/UH45 ... B3 resolve to 3.8 L.
- A413/NR ... B3 resolves to 4.6 L.
- A503/NR ... B3 resolves to 5.1 L; A503 ... VA remains 11 L.

A412/NR ... B5 remains verification-only because B5 is not an A-series gearbox mounting position in the legacy oil table. No guessed conversion is made.

All historical quantities remain reference fills. The final operating level is determined by the OEM level plug, sight glass, or dipstick.
