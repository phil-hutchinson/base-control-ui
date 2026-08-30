// The shared artwork every ship model `<use>`s: both sides' gradients, the
// green ship's turbojet group, and each side's whole hull and gauge-icon
// geometry, declared once here rather than duplicated per ship (see
// implementation-plan.md D1 - up to fourteen ships are on the board at
// once, and copying this much markup fourteen times over would repeat every
// id in it and put well over a thousand extra nodes into the document).
//
// Mounted once, at the app root, above both the start screen and the game,
// so it exists whichever screen is showing. It draws nothing itself -
// everything lives inside `<defs>`, which is never rendered directly but is
// always referenceable - and is hidden from layout and from the
// accessibility tree (D2): `position: absolute; width: 0; height: 0;
// overflow: hidden` in ShipDefs.css, deliberately not `display: none`,
// which some engines fail to resolve `<use>` references into.
//
// Ported from `.local/eg_spaceship.html` verbatim (settled decision 1): the
// only changes from that file are the id renames `shipArt.ts` requires,
// updated throughout to match, and the SVG-attribute-to-JSX-prop
// conversion React requires.

import { SHIP_ART, SHIP_DEFS_IDS } from "./shipArt";
import "./ShipDefs.css";

export function ShipDefs() {
  const green = SHIP_DEFS_IDS.green;
  const red = SHIP_DEFS_IDS.red;

  return (
    <svg aria-hidden="true" className="ship-defs">
      <defs>
        {/* Green ship: gradients */}
        <linearGradient id={green.gradFront} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#eef1f3" />
          <stop offset="30%" stopColor="#ccd3d8" />
          <stop offset="62%" stopColor="#a6afb6" />
          <stop offset="100%" stopColor="#79828a" />
        </linearGradient>
        <linearGradient id={green.gradDeck} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7f888f" />
          <stop offset="55%" stopColor="#c4ccd1" />
          <stop offset="100%" stopColor="#eef1f3" />
        </linearGradient>
        <linearGradient id={green.gradWing} x1="0" y1="0" x2="0.15" y2="1">
          <stop offset="0%" stopColor="#e4e8eb" />
          <stop offset="40%" stopColor="#b7bec4" />
          <stop offset="100%" stopColor="#787f86" />
        </linearGradient>
        <linearGradient id={green.gradRim} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f5f7f8" />
          <stop offset="46%" stopColor="#c0c8cd" />
          <stop offset="56%" stopColor="#a7b0b6" />
          <stop offset="100%" stopColor="#727b81" />
        </linearGradient>
        <radialGradient id={green.gradPod} cx="36%" cy="28%" r="80%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="45%" stopColor="#d4dbe0" />
          <stop offset="100%" stopColor="#868f97" />
        </radialGradient>
        <radialGradient id={green.gradBore} cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor="#0a140f" />
          <stop offset="60%" stopColor="#14261b" />
          <stop offset="100%" stopColor="#2f3b3c" />
        </radialGradient>
        <radialGradient id={green.gradGlow} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ccffd9" stopOpacity="0.9" />
          <stop offset="45%" stopColor="#3ce072" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#3ce072" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={green.gradNav} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#e7ffef" />
          <stop offset="35%" stopColor="#49d97e" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#49d97e" stopOpacity="0" />
        </radialGradient>

        {/* Green ship: gauge-icon geometry (hull + wings, then crew pod). No
            fill/stroke here - each gauge slot's <use> sets its own. */}
        <g id={SHIP_ART.green.gaugeIconId}>
          <path
            d="M8,0.5 Q10.6,1.5 10.8,8 Q11,13 11.7,16.6 Q9.9,17.8 8,17.8
                   Q6.1,17.8 4.3,16.6 Q5,13 5.2,8 Q5.4,1.5 8,0.5 Z
                   M5.3,6.5 Q2.6,9.5 0.6,14.5 Q0.4,15.4 1.4,15.4 L4.6,15.4 Z
                   M10.7,6.5 Q13.4,9.5 15.4,14.5 Q15.6,15.4 14.6,15.4 L11.4,15.4 Z"
          />
          <path d="M6.1,6 Q5.8,2.8 8,2.3 Q10.2,2.8 9.9,6 Q8,7.1 6.1,6 Z" />
        </g>

        {/* Green ship: one contained turbojet, drawn centred on the origin, `<use>`d three times by the hull */}
        <g id={green.jet}>
          <circle
            r="5"
            fill={`url(#${green.gradRim})`}
            stroke="#565f66"
            strokeWidth="0.6"
          />
          <circle r="4.3" fill={`url(#${green.gradGlow})`} />
          <circle r="3.5" fill={`url(#${green.gradBore})`} />
          <circle
            r="3.5"
            fill="none"
            stroke="#71ffa5"
            strokeWidth="0.7"
            opacity="0.85"
          />
          <circle r="2.4" fill="none" stroke="#3a4a44" strokeWidth="0.6" />
          <g stroke="#aeb7bd" strokeWidth="0.5" opacity="0.75">
            <line x1="0" y1="-1.2" x2="0" y2="-3.3" />
            <line x1="0" y1="1.2" x2="0" y2="3.3" />
            <line x1="-1.2" y1="0" x2="-3.3" y2="0" />
            <line x1="1.2" y1="0" x2="3.3" y2="0" />
            <line x1="-0.85" y1="-0.85" x2="-2.35" y2="-2.35" />
            <line x1="0.85" y1="-0.85" x2="2.35" y2="-2.35" />
            <line x1="-0.85" y1="0.85" x2="-2.35" y2="2.35" />
            <line x1="0.85" y1="0.85" x2="2.35" y2="2.35" />
          </g>
          <circle r="1.1" fill="#e6ebee" />
        </g>

        {/* Green ship: the whole hull */}
        <g id={SHIP_ART.green.hullId}>
          {/* ground shadow + green wash */}
          <ellipse
            cx="50"
            cy="99.7"
            rx="35"
            ry="4"
            fill="#000"
            opacity="0.22"
          />
          <ellipse
            cx="50"
            cy="100"
            rx="29"
            ry="5.5"
            fill={`url(#${green.gradGlow})`}
            opacity="0.5"
          />

          {/* swept delta wings: leading edge curved, back lines dead straight */}
          <path
            d="M29,88 Q22,85 5,67 Q6,65 8,66 L38,68 L29,88 Z"
            fill={`url(#${green.gradWing})`}
            stroke="#4fbf72"
            strokeWidth="0.8"
            strokeLinejoin="round"
          />
          <path
            d="M71,88 Q78,85 95,67 Q94,65 92,66 L62,68 L71,88 Z"
            fill={`url(#${green.gradWing})`}
            stroke="#4fbf72"
            strokeWidth="0.8"
            strokeLinejoin="round"
          />
          {/* swept leading edges picked out in green */}
          <path
            d="M29,88 Q22,85 5,67"
            fill="none"
            stroke="#43d777"
            strokeWidth="1.2"
          />
          <path
            d="M71,88 Q78,85 95,67"
            fill="none"
            stroke="#43d777"
            strokeWidth="1.2"
          />
          {/* spanwise panel line */}
          <path
            d="M34,73 Q20,70 9,66"
            fill="none"
            stroke="#9aa4ac"
            strokeWidth="0.4"
            opacity="0.5"
          />
          <path
            d="M66,73 Q80,70 91,66"
            fill="none"
            stroke="#9aa4ac"
            strokeWidth="0.4"
            opacity="0.5"
          />

          {/* top deck: a rounded surface we look down onto, receding away from us */}
          <path
            d="M32,77
               Q33.5,69 39,63.5
               Q50,61.5 61,63.5
               Q66.5,69 68,77
               Q50,79 32,77 Z"
            fill={`url(#${green.gradDeck})`}
            stroke="#4fbf72"
            strokeWidth="1"
            strokeLinejoin="round"
          />
          {/* longitudinal lines converging toward a vanishing point */}
          <g stroke="#9aa4ac" strokeWidth="0.4" opacity="0.5">
            <line x1="38" y1="77" x2="42" y2="63.5" />
            <line x1="50" y1="77.5" x2="50" y2="63" />
            <line x1="62" y1="77" x2="58" y2="63.5" />
          </g>
          {/* cross lines, bunched toward the back for foreshortening */}
          <g stroke="#aeb7bd" strokeWidth="0.35" opacity="0.38">
            <path d="M34,73.6 Q50,75 66,73.6" fill="none" />
            <path d="M36.2,69.5 Q50,70.7 63.8,69.5" fill="none" />
            <path d="M38,66 Q50,67 62,66" fill="none" />
            <path d="M39.4,64 Q50,64.8 60.6,64" fill="none" />
          </g>
          {/* raised centre spine */}
          <path
            d="M48.7,77 L51.3,77 L50.5,63.2 L49.5,63.2 Z"
            fill="#e6edf1"
            opacity="0.45"
          />

          {/* rounded crew pod, sitting forward on the deck */}
          <path
            d="M42.5,75.6 Q41,65.4 50,63 Q59,65.4 57.5,75.6 Q50,77.1 42.5,75.6 Z"
            fill={`url(#${green.gradPod})`}
            stroke="#4fbf72"
            strokeWidth="0.9"
            strokeLinejoin="round"
          />
          <ellipse
            cx="47.3"
            cy="66.6"
            rx="2.6"
            ry="1.4"
            fill="#ffffff"
            opacity="0.45"
          />
          {/* wrap-around green viewport */}
          <path
            d="M44.6,74.4 Q43.9,68 50,65.9 Q56.1,68 55.4,74.4 Q50,75.7 44.6,74.4 Z"
            fill="#1c6b3d"
            opacity="0.92"
            stroke="#8effb5"
            strokeWidth="0.6"
            strokeLinejoin="round"
          />
          <path
            d="M45.8,67.6 Q48,66.2 50.4,66.4"
            fill="none"
            stroke="#cffde0"
            strokeWidth="0.55"
            opacity="0.7"
          />
          <path
            d="M42.5,75.6 Q50,77.1 57.5,75.6"
            fill="none"
            stroke="#3a4a44"
            strokeWidth="0.4"
            opacity="0.4"
          />
          {/* pod beacon */}
          <circle cx="50" cy="63.2" r="1.4" fill={`url(#${green.gradNav})`} />
          <circle cx="50" cy="63.2" r="0.55" fill="#eafff2" />

          {/* front face: engine housing, flaring out toward the bottom, rounded corners */}
          <path
            d="M32,77
               L68,77
               L77,94
               Q79,99 74,99
               L26,99
               Q21,99 23,94 Z"
            fill={`url(#${green.gradFront})`}
            stroke="#4fbf72"
            strokeWidth="1.3"
            strokeLinejoin="round"
          />
          {/* bright lip where the deck meets the front face */}
          <path
            d="M32,77 L68,77 L66,79 L34,79 Z"
            fill="#ffffff"
            opacity="0.3"
          />
          {/* lower shadow + green sill */}
          <path
            d="M25,94.5 L75,94.5 L77,98.3 Q76,99 74,99 L26,99 Q24,99 23,98.3 Z"
            fill="#0b3d22"
            opacity="0.5"
          />
          <path
            d="M24.5,97.7 Q50,98.7 75.5,97.7"
            fill="none"
            stroke="#6dffa1"
            strokeWidth="1"
            opacity="0.85"
          />

          {/* green player chevron on the housing face */}
          <path
            d="M50,86 L46,83 L47.6,83 L50,85 L52.4,83 L54,83 Z"
            fill="#7dffab"
            opacity="0.85"
          />

          {/* engine-bay panel lines + green conduits, splaying with the flare */}
          <g stroke="#7c858b" strokeWidth="0.5" opacity="0.6">
            <line x1="43" y1="79" x2="41.5" y2="97" />
            <line x1="57" y1="79" x2="58.5" y2="97" />
          </g>
          <g stroke="#43d777" strokeWidth="0.8" opacity="0.7">
            <line x1="32" y1="80" x2="28.5" y2="96.5" />
            <line x1="68" y1="80" x2="71.5" y2="96.5" />
          </g>

          {/* three big turbojets, low in the hull */}
          <use href={`#${green.jet}`} transform="translate(36,91) scale(1.1)" />
          <use href={`#${green.jet}`} transform="translate(50,91) scale(1.1)" />
          <use href={`#${green.jet}`} transform="translate(64,91) scale(1.1)" />

          {/* nav lights */}
          <circle cx="33" cy="77.5" r="2" fill={`url(#${green.gradNav})`} />
          <circle cx="67" cy="77.5" r="2" fill={`url(#${green.gradNav})`} />
          <circle cx="5" cy="67" r="2.2" fill={`url(#${green.gradNav})`} />
          <circle cx="95" cy="67" r="2.2" fill={`url(#${green.gradNav})`} />
          <circle cx="25" cy="98" r="1.6" fill={`url(#${green.gradNav})`} />
          <circle cx="75" cy="98" r="1.6" fill={`url(#${green.gradNav})`} />
          <circle cx="5" cy="67" r="0.8" fill="#eafff2" />
          <circle cx="95" cy="67" r="0.8" fill="#eafff2" />
        </g>

        {/* Red ship: gradients */}
        <radialGradient id={red.gradFace} cx="38%" cy="24%" r="85%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="42%" stopColor="#d6dce1" />
          <stop offset="100%" stopColor="#828b93" />
        </radialGradient>
        <linearGradient id={red.gradRim} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c6cdd2" />
          <stop offset="50%" stopColor="#969ea5" />
          <stop offset="100%" stopColor="#5c636b" />
        </linearGradient>
        <linearGradient id={red.gradNacelle} x1="0" y1="0" x2="0.12" y2="1">
          <stop offset="0%" stopColor="#eef1f3" />
          <stop offset="45%" stopColor="#b4bcc2" />
          <stop offset="100%" stopColor="#6c747c" />
        </linearGradient>
        <radialGradient id={red.gradBore} cx="50%" cy="42%" r="60%">
          <stop offset="0%" stopColor="#0b0f13" />
          <stop offset="60%" stopColor="#1c232a" />
          <stop offset="100%" stopColor="#39424a" />
        </radialGradient>
        <radialGradient id={red.gradEglow} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffdada" stopOpacity="0.95" />
          <stop offset="45%" stopColor="#ff0000" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#ff0000" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={red.gradNav} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffe0e0" />
          <stop offset="35%" stopColor="#ff0000" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#ff0000" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={red.gradPod} cx="36%" cy="26%" r="82%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="45%" stopColor="#d2d9de" />
          <stop offset="100%" stopColor="#828b93" />
        </radialGradient>

        {/* Red ship: gauge-icon geometry (disk circle + engine rod). No
            fill/stroke here - each gauge slot's <use> sets its own. */}
        <g id={SHIP_ART.red.gaugeIconId}>
          <circle cx="8" cy="9" r="7" />
          <rect x="6.15" y="1.4" width="3.7" height="15.2" rx="1.85" />
        </g>

        {/* Red ship: the whole hull */}
        <g id={SHIP_ART.red.hullId}>
          {/* ground shadow + red wash */}
          <ellipse
            cx="50"
            cy="99.5"
            rx="34"
            ry="4"
            fill="#000"
            opacity="0.22"
          />
          <ellipse
            cx="50"
            cy="100"
            rx="27"
            ry="5"
            fill={`url(#${red.gradEglow})`}
            opacity="0.4"
          />

          {/* disk rim: the penny's thickness, seen along the front, with player trim */}
          <path
            d="M17,82 C17,95 83,95 83,82 L83,89 C83,102 17,102 17,89 Z"
            fill={`url(#${red.gradRim})`}
            stroke="#ff2020"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
          {/* rim parting highlight + red equator stripe */}
          <path
            d="M18,85 Q50,92.5 82,85"
            fill="none"
            stroke="#ccd3d8"
            strokeWidth="0.5"
            opacity="0.55"
          />
          <path
            d="M18,87 Q50,94.5 82,87"
            fill="none"
            stroke="#e00000"
            strokeWidth="0.8"
            opacity="0.5"
          />
          <g stroke="#727b81" strokeWidth="0.4" opacity="0.5">
            <path d="M30,86 L29.5,93.5" fill="none" />
            <path d="M70,86 L70.5,93.5" fill="none" />
          </g>
          {/* red sill */}
          <path
            d="M20,91 Q50,97.5 80,91"
            fill="none"
            stroke="#ff4d4d"
            strokeWidth="0.9"
            opacity="0.7"
          />

          {/* disk top face: the surface we look down onto, red player trim */}
          <ellipse
            cx="50"
            cy="82"
            rx="33"
            ry="10"
            fill={`url(#${red.gradFace})`}
            stroke="#ff2020"
            strokeWidth="1.2"
          />
          {/* bright front lip */}
          <path
            d="M20,84 Q30,88.5 50,88.7 Q70,88.5 80,84"
            fill="none"
            stroke="#ffffff"
            strokeWidth="1"
            opacity="0.3"
          />
          {/* concentric panel rings */}
          <g fill="none" stroke="#9aa4ac" strokeWidth="0.4" opacity="0.45">
            <ellipse cx="50" cy="81" rx="25" ry="7.4" />
            <ellipse cx="50" cy="81" rx="16" ry="4.6" />
            <ellipse cx="50" cy="80.6" rx="8" ry="2.5" />
          </g>
          {/* radial spokes, foreshortened */}
          <g stroke="#9aa4ac" strokeWidth="0.35" opacity="0.4">
            <line x1="50" y1="81" x2="79" y2="81" />
            <line x1="50" y1="81" x2="65" y2="88" />
            <line x1="50" y1="81" x2="35" y2="88" />
            <line x1="50" y1="81" x2="21" y2="81" />
            <line x1="50" y1="81" x2="35" y2="74" />
            <line x1="50" y1="81" x2="65" y2="74" />
          </g>
          {/* red accent ring */}
          <ellipse
            cx="50"
            cy="81"
            rx="29"
            ry="8.5"
            fill="none"
            stroke="#e00000"
            strokeWidth="0.7"
            opacity="0.55"
          />

          {/* red-player chevron: its arms reach up to the top-face border circle */}
          <path
            d="M50,98.4 L44.5,91.9 L46.7,91.9 L50,96 L53.3,91.9 L55.5,91.9 Z"
            fill="#ff0000"
            opacity="0.9"
          />

          {/* turbojet as a rod spanning the disk's full diameter: the turbine
              face points forward at us, the barrel recedes up and away, its
              closed rounded far end rising clear of the ship's back edge */}
          <path
            d="M44,86 Q43,78 47,73.6 Q50,72 53,73.4 Q49.5,76 48,81 Q47,85.5 50.5,88.4 Q46,88 44,86 Z"
            fill="#000"
            opacity="0.13"
          />
          <path
            d="M41.7,85 Q40.6,76 44.5,67.5 Q50,64 55.5,67.5 Q59.4,76 58.3,85 Q50,87.8 41.7,85 Z"
            fill={`url(#${red.gradNacelle})`}
            stroke="#7a828a"
            strokeWidth="0.7"
            strokeLinejoin="round"
          />
          {/* shadow side down the right of the barrel */}
          <path
            d="M56.6,69 Q58,76 57.4,83"
            fill="none"
            stroke="#5f666e"
            strokeWidth="0.7"
            opacity="0.5"
          />

          {/* forward turbine face */}
          <ellipse
            cx="50"
            cy="85"
            rx="8.3"
            ry="7"
            fill={`url(#${red.gradRim})`}
          />
          <ellipse
            cx="50"
            cy="85"
            rx="8.3"
            ry="7"
            fill="none"
            stroke="#ff2020"
            strokeWidth="1"
          />
          <ellipse
            cx="50"
            cy="85"
            rx="6.4"
            ry="5.4"
            fill={`url(#${red.gradBore})`}
          />
          <ellipse
            cx="50"
            cy="85.3"
            rx="4.8"
            ry="4"
            fill={`url(#${red.gradEglow})`}
          />
          <ellipse
            cx="50"
            cy="85"
            rx="5.6"
            ry="4.7"
            fill="none"
            stroke="#ff0000"
            strokeWidth="0.8"
            opacity="0.85"
          />
          <ellipse
            cx="50"
            cy="85"
            rx="3.4"
            ry="2.9"
            fill="none"
            stroke="#3a4048"
            strokeWidth="0.6"
          />
          <g stroke="#aeb7bd" strokeWidth="0.45" opacity="0.75">
            <line x1="51.5" y1="85" x2="54.8" y2="85" />
            <line x1="51.3" y1="85.63" x2="54.16" y2="87" />
            <line x1="50.75" y1="86.08" x2="52.4" y2="88.46" />
            <line x1="50" y1="86.25" x2="50" y2="89" />
            <line x1="49.25" y1="86.08" x2="47.6" y2="88.46" />
            <line x1="48.7" y1="85.63" x2="45.84" y2="87" />
            <line x1="48.5" y1="85" x2="45.2" y2="85" />
            <line x1="48.7" y1="84.37" x2="45.84" y2="83" />
            <line x1="49.25" y1="83.92" x2="47.6" y2="81.54" />
            <line x1="50" y1="83.75" x2="50" y2="81" />
            <line x1="50.75" y1="83.92" x2="52.4" y2="81.54" />
            <line x1="51.3" y1="84.37" x2="54.16" y2="83" />
          </g>
          <ellipse cx="50" cy="85" rx="1.5" ry="1.3" fill="#e6ebee" />
          <ellipse
            cx="49.4"
            cy="84.4"
            rx="0.6"
            ry="0.5"
            fill="#ffffff"
            opacity="0.8"
          />
          <path
            d="M44.3,82 Q45.8,79.2 49,78.4"
            fill="none"
            stroke="#ffffff"
            strokeWidth="0.7"
            opacity="0.5"
          />

          {/* command pods flanking the engine, one each side */}
          <path
            d="M27.5,85.5 Q26,78.5 33,76.6 Q40,78.5 38.5,85.5 Q33,87 27.5,85.5 Z"
            fill={`url(#${red.gradPod})`}
            stroke="#ff0000"
            strokeWidth="0.9"
            strokeLinejoin="round"
          />
          <ellipse
            cx="30.7"
            cy="79.7"
            rx="2.4"
            ry="1.3"
            fill="#ffffff"
            opacity="0.5"
          />
          <path
            d="M29.2,84.4 Q28.6,79.7 33,78.1 Q37.4,79.7 36.8,84.4 Q33,85.6 29.2,84.4 Z"
            fill="#8b0000"
            opacity="0.92"
            stroke="#ff9e9e"
            strokeWidth="0.6"
            strokeLinejoin="round"
          />
          <circle cx="33" cy="76" r="1.3" fill={`url(#${red.gradNav})`} />
          <circle cx="33" cy="76" r="0.5" fill="#ffe0e0" />
          <path
            d="M72.5,85.5 Q74,78.5 67,76.6 Q60,78.5 61.5,85.5 Q67,87 72.5,85.5 Z"
            fill={`url(#${red.gradPod})`}
            stroke="#ff0000"
            strokeWidth="0.9"
            strokeLinejoin="round"
          />
          <ellipse
            cx="69.3"
            cy="79.7"
            rx="2.4"
            ry="1.3"
            fill="#ffffff"
            opacity="0.5"
          />
          <path
            d="M70.8,84.4 Q71.4,79.7 67,78.1 Q62.6,79.7 63.2,84.4 Q67,85.6 70.8,84.4 Z"
            fill="#8b0000"
            opacity="0.92"
            stroke="#ff9e9e"
            strokeWidth="0.6"
            strokeLinejoin="round"
          />
          <circle cx="67" cy="76" r="1.3" fill={`url(#${red.gradNav})`} />
          <circle cx="67" cy="76" r="0.5" fill="#ffe0e0" />

          {/* nav lights */}
          <circle cx="17" cy="82" r="2.2" fill={`url(#${red.gradNav})`} />
          <circle cx="83" cy="82" r="2.2" fill={`url(#${red.gradNav})`} />
          <circle cx="17" cy="82" r="0.8" fill="#fff2ee" />
          <circle cx="83" cy="82" r="0.8" fill="#fff2ee" />
          <circle cx="50" cy="97.5" r="1.5" fill={`url(#${red.gradNav})`} />
          <circle cx="50" cy="97.5" r="0.55" fill="#fff2ee" />
        </g>
      </defs>
    </svg>
  );
}
