// The fourteen bays' planets, one hidden sprite holding all of them, ported
// from `doc/plan/00000013-spaceship-bay-visual/eg_planets.html` verbatim: the
// only changes from that gallery are the id renames `planetArt.ts` requires,
// the SVG-attribute-to-JSX-prop conversion React requires, and five specific
// fixes applied nowhere else - `p1moon-sheen`, defined twice in the gallery
// with identical content, is declared once; the commented-out and disabled
// material throughout (an orphaned block between planets 1 and 2, a disabled
// crater group in planet 6, a disabled `<rect>` in planet 4, and the disabled
// ring-sheen and moon-sheen circles in planets 14 and 9) is dropped; planet
// 7's ring gradient's invalid `stop-color="777"` (a missing `#`, which
// renders black) is written as the explicit `#000` it already rendered as;
// planet 9's stray `opacity="0.8 "` trailing spaces are trimmed; and planets
// 1 and 2's hardcoded backing fills (`black`, `#151c31`) are unified to
// `#151c31`, the --color-space-raised literal. Nothing else about the
// geometry, colours or structure differs from the gallery.
//
// Mounted once, on the board, since planets appear only there. It draws
// nothing itself - everything lives inside `<defs>`, which is never rendered
// directly but is always referenceable - and is hidden from layout and from
// the accessibility tree: hidden by zero size, not by `display`, in
// PlanetDefs.css, so a `<use>` reference into it still resolves.

import { PLANETS, type PlanetArt } from "./planetArt";
import "./PlanetDefs.css";

const PLANETS_BY_NUMBER = new Map<number, PlanetArt>(
  PLANETS.map((planet) => [planet.number, planet]),
);

/** The ids the planet with this gallery number declares, keyed by part name. */
function idsFor(number: number): Readonly<Record<string, string>> {
  const planet = PLANETS_BY_NUMBER.get(number);
  if (planet === undefined) {
    throw new Error(`planetArt.ts declares no planet ${number}`);
  }
  return planet.ids;
}

export function PlanetDefs() {
  const p1 = idsFor(1);
  const p2 = idsFor(2);
  const p3 = idsFor(3);
  const p4 = idsFor(4);
  const p5 = idsFor(5);
  const p6 = idsFor(6);
  const p7 = idsFor(7);
  const p8 = idsFor(8);
  const p9 = idsFor(9);
  const p10 = idsFor(10);
  const p11 = idsFor(11);
  const p12 = idsFor(12);
  const p13 = idsFor(13);
  const p14 = idsFor(14);

  return (
    <svg aria-hidden="true" className="planet-defs">
      <defs>
        {/* Planet 1: tan-and-blue planet with a cratered moon */}
        <radialGradient id={p1.surface} cx="40%" cy="40%" r="70%">
          <stop offset="0%" stopColor="tan" stopOpacity="1" />
          <stop offset="100%" stopColor="cornflowerblue" stopOpacity="0.4" />
        </radialGradient>
        <radialGradient id={p1["moon-sheen"]} cx="40%" cy="40%" r="70%">
          <stop offset="0%" stopColor="white" stopOpacity="0.55" />
          <stop offset="100%" stopColor="rebeccapurple" stopOpacity="0.1" />
        </radialGradient>
        <filter id={p1.blur}>
          <feGaussianBlur stdDeviation="0.8" />
        </filter>
        <clipPath id={p1["moon-clip"]}>
          <circle cx="20" cy="53" r="13" />
        </clipPath>
        <g id={p1.body}>
          {/* moon */}
          <g filter={`url(#${p1.blur})`} clipPath={`url(#${p1["moon-clip"]})`}>
            <circle cx="20" cy="53" r="15" fill="#E6E8BA" />
            <g transform="translate(19 62)">
              <circle cx="0" cy="0" r="4" fill="#B6A87A" stroke="#9A7909" />
            </g>
            <g transform="translate(13 49)">
              <circle cx="0" cy="0" r="3" fill="#B6A87A" stroke="#9A7909" />
            </g>
            <g transform="translate(23 45)">
              <circle cx="0" cy="0" r="3" fill="#B6A87A" stroke="#9A7909" />
            </g>
          </g>
          <circle cx="20" cy="53" r="13" fill={`url(#${p1["moon-sheen"]})`} />
          {/* planet */}
          <circle cx="50" cy="50" r="28" fill="#151c31" />
          <circle cx="50" cy="50" r="28" fill={`url(#${p1.surface})`} />
        </g>

        {/* Planet 2: peru-and-purple planet with four identical moons */}
        <radialGradient id={p2.surface} cx="40%" cy="40%" r="70%">
          <stop offset="0%" stopColor="peru" stopOpacity="1" />
          <stop offset="100%" stopColor="rebeccapurple" stopOpacity="0.3" />
        </radialGradient>
        <g id={p2.body}>
          <circle cx="50" cy="50" r="25" fill="#151c31" />
          <circle cx="50" cy="50" r="25" fill={`url(#${p2.surface})`} />
          <circle cx="37" cy="51" r="8" fill="#151c31" />
          <circle cx="37" cy="51" r="8" fill={`url(#${p2.surface})`} />
          <circle cx="28" cy="84" r="6" fill={`url(#${p2.surface})`} />
          <circle cx="87" cy="63" r="8" fill={`url(#${p2.surface})`} />
          <circle cx="11" cy="57" r="7" fill={`url(#${p2.surface})`} />
        </g>

        {/* Planet 3: banded chocolate-brown planet */}
        <linearGradient id={p3.surface} x1="0.2" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="BurlyWood" stopOpacity="1" />
          <stop offset="0.15" stopColor="SaddleBrown" stopOpacity="1" />
          <stop offset="0.25" stopColor="BurlyWood" stopOpacity="1" />
          <stop offset="0.37" stopColor="SaddleBrown" stopOpacity="1" />
          <stop offset="0.44" stopColor="Chocolate" stopOpacity="1" />
          <stop offset="0.52" stopColor="SaddleBrown" stopOpacity="1" />
          <stop offset="0.65" stopColor="BurlyWood" stopOpacity="1" />
          <stop offset="0.72" stopColor="Chocolate" stopOpacity="1" />
          <stop offset="0.84" stopColor="SaddleBrown" stopOpacity="1" />
          <stop offset="0.95" stopColor="BurlyWood" stopOpacity="1" />
          <stop offset="1" stopColor="SaddleBrown" stopOpacity="1" />
        </linearGradient>
        <radialGradient id={p3.sheen} cx="40%" cy="40%" r="70%">
          <stop offset="0%" stopColor="white" stopOpacity="0.75" />
          <stop offset="100%" stopColor="rebeccapurple" stopOpacity="0.1" />
        </radialGradient>
        <g id={p3.body}>
          <circle cx="50" cy="50" r="34" fill={`url(#${p3.surface})`} />
          <circle cx="50" cy="50" r="34" fill={`url(#${p3.sheen})`} />
        </g>

        {/* Planet 4: blue-green water world with ice caps */}
        <linearGradient id={p4.surface} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="1" />
          <stop offset="0.17" stopColor="#3E38E5" stopOpacity="1" />
          <stop offset="0.5" stopColor="#372DF0" stopOpacity="1" />
          <stop offset="0.83" stopColor="#3E38E5" stopOpacity="1" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="1" />
        </linearGradient>
        <filter id={p4.blur}>
          <feGaussianBlur stdDeviation="1.55" />
        </filter>
        <radialGradient id={p4.sheen} cx="40%" cy="40%" r="70%">
          <stop offset="0%" stopColor="white" stopOpacity="0.75" />
          <stop offset="100%" stopColor="rebeccapurple" stopOpacity="0.1" />
        </radialGradient>
        <clipPath id={p4.clip}>
          <circle cx="50" cy="50" r="26" />
        </clipPath>
        <g id={p4.body}>
          <g filter={`url(#${p4.blur})`} clipPath={`url(#${p4.clip})`}>
            <circle cx="50" cy="50" r="28" fill={`url(#${p4.surface})`} />
            <circle cx="51" cy="48" r="14" fill="#32954e" />
            <circle cx="50" cy="62" r="5" fill="#31ae48" />
            <circle cx="40" cy="46" r="7" fill="#4c9645" />
            <polygon
              points="40,50 60,60 65,70 70,55 55,42"
              fill="#E4E4D3"
              opacity="0.88"
            />
            <polyline
              points="36,36 48,32 57,34"
              fill="none"
              stroke="#BBB"
              strokeWidth="3"
            />
            <circle cx="41" cy="61" r="4" fill="#b7c9de" />
            <circle cx="68" cy="38" r="5" fill="#d7d9de" />
          </g>
          <circle cx="50" cy="50" r="26" fill={`url(#${p4.sheen})`} />
        </g>

        {/* Planet 5: gold planet with a wide ring */}
        <radialGradient id={p5.surface} cx="40%" cy="40%" r="100%">
          <stop offset="0%" stopColor="#755E00" />
          <stop offset="100%" stopColor="#574600" />
        </radialGradient>
        <radialGradient id={p5.sheen} cx="40%" cy="40%" r="70%">
          <stop offset="0%" stopColor="white" stopOpacity="0.75" />
          <stop offset="100%" stopColor="rebeccapurple" stopOpacity="0.1" />
        </radialGradient>
        <radialGradient
          id={p5.ring}
          gradientUnits="userSpaceOnUse"
          cx="0"
          cy="0"
          r="45"
        >
          <stop offset="0.55" stopColor="#FAE18F" />
          <stop offset="0.76" stopColor="#A38300" />
          <stop offset="0.81" stopColor="#FCEDBB" />
          <stop offset="0.9" stopColor="#F8D763" />
          <stop offset="1" stopColor="#000" />
        </radialGradient>
        <radialGradient
          id={p5["ring-sheen"]}
          gradientUnits="userSpaceOnUse"
          gradientTransform="scale(1,5)"
          cx="-17.5"
          cy="6.06"
          r="40"
        >
          <stop offset="0%" stopColor="white" stopOpacity="0.55" />
          <stop offset="100%" stopColor="rebeccapurple" stopOpacity="0.1" />
        </radialGradient>
        <g id={p5["ring-whole"]} transform="translate(50,50) scale(1,0.2)">
          <circle
            r="35"
            fill="none"
            stroke={`url(#${p5.ring})`}
            strokeWidth="20"
          />
          <circle
            r="35"
            fill="none"
            stroke={`url(#${p5["ring-sheen"]})`}
            strokeWidth="20"
          />
        </g>
        <clipPath id={p5["ring-back"]}>
          <rect x="0" y="0" width="100" height="50" />
        </clipPath>
        <clipPath id={p5["ring-front"]}>
          <rect x="0" y="49.6" width="100" height="50.4" />
        </clipPath>
        <g id={p5.body}>
          <use
            href={`#${p5["ring-whole"]}`}
            clipPath={`url(#${p5["ring-back"]})`}
          />
          <circle cx="50" cy="50" r="18" fill={`url(#${p5.surface})`} />
          <circle cx="50" cy="50" r="18" fill={`url(#${p5.sheen})`} />
          <use
            href={`#${p5["ring-whole"]}`}
            clipPath={`url(#${p5["ring-front"]})`}
          />
        </g>

        {/* Planet 6: double planet - banded brown with a cratered companion */}
        <linearGradient
          id={p6.surface}
          x1="0"
          y1="0"
          x2="16"
          y2="84"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="BurlyWood" stopOpacity="1" />
          <stop offset="15%" stopColor="SaddleBrown" stopOpacity="1" />
          <stop offset="25%" stopColor="BurlyWood" stopOpacity="1" />
          <stop offset="35%" stopColor="Chocolate" stopOpacity="1" />
          <stop offset="52%" stopColor="SaddleBrown" stopOpacity="1" />
          <stop offset="64%" stopColor="BurlyWood" stopOpacity="1" />
          <stop offset="72%" stopColor="Chocolate" stopOpacity="1" />
          <stop offset="85%" stopColor="BurlyWood" stopOpacity="1" />
          <stop offset="100%" stopColor="SaddleBrown" stopOpacity="1" />
        </linearGradient>
        <radialGradient id={p6.sheen} cx="40%" cy="40%" r="70%">
          <stop offset="0%" stopColor="white" stopOpacity="0.75" />
          <stop offset="100%" stopColor="rebeccapurple" stopOpacity="0.1" />
        </radialGradient>
        <radialGradient id={p6["moon-sheen"]} cx="40%" cy="40%" r="70%">
          <stop offset="0%" stopColor="white" stopOpacity="0.55" />
          <stop offset="100%" stopColor="rebeccapurple" stopOpacity="0.1" />
        </radialGradient>
        <filter id={p6.blur}>
          <feGaussianBlur stdDeviation="2.1" />
        </filter>
        <clipPath id={p6["moon-clip"]}>
          <circle cx="62" cy="62" r="26" />
        </clipPath>
        <g id={p6.body}>
          {/* rear planet */}
          <g transform="scale(0.71)">
            <circle cx="50" cy="50" r="34" fill={`url(#${p6.surface})`} />
            <circle cx="50" cy="50" r="34" fill={`url(#${p6.sheen})`} />
          </g>
          {/* front, cratered companion */}
          <g filter={`url(#${p6.blur})`} clipPath={`url(#${p6["moon-clip"]})`}>
            <circle cx="62" cy="62" r="28" fill="#E6D8BA" />
            <g transform="translate(62 40) scale(1.5 1)">
              <circle cx="0" cy="0" r="5" fill="#A39C99" stroke="#754617" />
            </g>
            <circle cx="54" cy="57" r="5" fill="#A39C99" stroke="#754617" />
            <circle cx="55" cy="70" r="4" fill="#A39C99" stroke="#754617" />
            <circle cx="51" cy="64" r="4" fill="#B0996F" stroke="#754617" />
            <circle cx="68" cy="77" r="5" fill="#B0996F" stroke="#754617" />
            <g transform="translate(81 53) rotate(40) scale(1.3 1)">
              <circle cx="0" cy="0" r="7" fill="#A39C99" stroke="#754617" />
            </g>
          </g>
          <circle cx="62" cy="62" r="26" fill={`url(#${p6["moon-sheen"]})`} />
        </g>

        {/* Planet 7: brown-and-pink planet with a tilted grey ring */}
        <linearGradient id={p7.surface} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#693F07" stopOpacity="1" />
          <stop offset="0.25" stopColor="#C8A89F" stopOpacity="1" />
          <stop offset="0.44" stopColor="#6F4001" stopOpacity="1" />
          <stop offset="0.54" stopColor="#FEF6E7" stopOpacity="1" />
          <stop offset="0.77" stopColor="#663914" stopOpacity="1" />
          <stop offset="1" stopColor="#BBABBD" stopOpacity="1" />
        </linearGradient>
        <radialGradient id={p7.sheen} cx="40%" cy="40%" r="70%">
          <stop offset="0%" stopColor="white" stopOpacity="0.75" />
          <stop offset="100%" stopColor="rebeccapurple" stopOpacity="0.1" />
        </radialGradient>
        <radialGradient
          id={p7.ring}
          gradientUnits="userSpaceOnUse"
          cx="0"
          cy="0"
          r="47"
        >
          <stop offset="0.61" stopColor="#BBB" />
          <stop offset="0.72" stopColor="#999" />
          <stop offset="0.77" stopColor="#DDD" />
          <stop offset="0.84" stopColor="#AAA" />
          <stop offset="1" stopColor="#000" />
        </radialGradient>
        <g id={p7["ring-whole"]} transform="translate(50,50) scale(1,0.2)">
          <circle
            r="39"
            fill="none"
            stroke={`url(#${p7.ring})`}
            strokeWidth="16"
          />
        </g>
        <clipPath id={p7["ring-back"]}>
          <rect x="0" y="0" width="100" height="50" />
        </clipPath>
        <clipPath id={p7["ring-front"]}>
          <rect x="0" y="49.6" width="100" height="50.4" />
        </clipPath>
        <g id={p7.body} transform="rotate(-38 50 50)">
          <use
            href={`#${p7["ring-whole"]}`}
            clipPath={`url(#${p7["ring-back"]})`}
          />
          <circle cx="50" cy="50" r="25" fill={`url(#${p7.surface})`} />
          <circle
            cx="50"
            cy="50"
            r="25"
            fill={`url(#${p7.sheen})`}
            transform="rotate(38 50 50)"
          />
          <use
            href={`#${p7["ring-whole"]}`}
            clipPath={`url(#${p7["ring-front"]})`}
          />
        </g>

        {/* Planet 8: turquoise planet with a vertical white ring */}
        <linearGradient id={p8.surface} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4BD8C7" stopOpacity="1" />
          <stop offset="0.15" stopColor="#4BD8C2" stopOpacity="1" />
          <stop offset="0.36" stopColor="#51DCC3" stopOpacity="1" />
          <stop offset="0.51" stopColor="#40E0D0" stopOpacity="1" />
          <stop offset="0.62" stopColor="#42E0D1" stopOpacity="1" />
          <stop offset="0.80" stopColor="#46DDC9" stopOpacity="1" />
          <stop offset="1" stopColor="#4CDCC1" stopOpacity="1" />
        </linearGradient>
        <radialGradient id={p8.sheen} cx="40%" cy="40%" r="70%">
          <stop offset="0%" stopColor="white" stopOpacity="0.75" />
          <stop offset="100%" stopColor="rebeccapurple" stopOpacity="0.1" />
        </radialGradient>
        <radialGradient
          id={p8.ring}
          gradientUnits="userSpaceOnUse"
          cx="0"
          cy="0"
          r="50"
        >
          <stop offset="0" stopColor="White" />
          <stop offset="1" stopColor="White" />
        </radialGradient>
        <g id={p8["ring-whole"]} transform="translate(50,50) scale(1,0.2)">
          <circle
            r="42"
            fill="none"
            stroke={`url(#${p8.ring})`}
            strokeWidth="8"
          />
        </g>
        <clipPath id={p8["ring-back"]}>
          <rect x="0" y="0" width="100" height="50" />
        </clipPath>
        <clipPath id={p8["ring-front"]}>
          <rect x="0" y="49.6" width="100" height="50.4" />
        </clipPath>
        <g id={p8.body} transform="rotate(-90 50 50)">
          <use
            href={`#${p8["ring-whole"]}`}
            clipPath={`url(#${p8["ring-back"]})`}
            opacity="0.95"
          />
          <circle cx="50" cy="50" r="34" fill={`url(#${p8.surface})`} />
          <circle
            cx="50"
            cy="50"
            r="34"
            fill={`url(#${p8.sheen})`}
            transform="rotate(90 50 50)"
          />
          <use
            href={`#${p8["ring-whole"]}`}
            clipPath={`url(#${p8["ring-front"]})`}
            opacity="0.95"
          />
        </g>

        {/* Planet 9: banded brown planet with an earth-like moon */}
        <linearGradient id={p9.surface} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="BurlyWood" stopOpacity="1" />
          <stop offset="0.08" stopColor="SeaShell" stopOpacity="1" />
          <stop offset="0.22" stopColor="SaddleBrown" stopOpacity="1" />
          <stop offset="0.34" stopColor="BurlyWood" stopOpacity="1" />
          <stop offset="0.42" stopColor="SaddleBrown" stopOpacity="1" />
          <stop offset="0.59" stopColor="BurlyWood" stopOpacity="1" />
          <stop offset="0.69" stopColor="SeaShell" stopOpacity="1" />
          <stop offset="0.74" stopColor="SaddleBrown" stopOpacity="1" />
          <stop offset="0.80" stopColor="SeaShell" stopOpacity="1" />
          <stop offset="0.90" stopColor="BurlyWood" stopOpacity="1" />
          <stop offset="1" stopColor="SaddleBrown" stopOpacity="1" />
        </linearGradient>
        <radialGradient id={p9.sheen} cx="40%" cy="40%" r="70%">
          <stop offset="0%" stopColor="white" stopOpacity="0.75" />
          <stop offset="100%" stopColor="rebeccapurple" stopOpacity="0.1" />
        </radialGradient>
        <linearGradient id={p9["moon-surface"]} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1e10ef" stopOpacity="1" />
          <stop offset="0.17" stopColor="#3E38E5" stopOpacity="1" />
          <stop offset="0.5" stopColor="#372DF0" stopOpacity="1" />
          <stop offset="0.8" stopColor="#4E48E8" stopOpacity="1" />
          <stop offset="1" stopColor="#262ed9" stopOpacity="1" />
        </linearGradient>
        <filter id={p9.blur}>
          <feGaussianBlur stdDeviation="1.6" />
        </filter>
        <clipPath id={p9["moon-clip"]}>
          <circle cx="63" cy="55" r="18" />
        </clipPath>
        <g id={p9.body}>
          {/* planet */}
          <g transform="rotate(49 50 50)">
            <circle cx="50" cy="50" r="41" fill={`url(#${p9.surface})`} />
            <circle
              cx="50"
              cy="50"
              r="41"
              fill={`url(#${p9.sheen})`}
              transform="rotate(-49 50 50)"
            />
          </g>
          {/* moon */}
          <g
            filter={`url(#${p9.blur})`}
            clipPath={`url(#${p9["moon-clip"]})`}
            transform="rotate(-22,63,55)"
          >
            <circle
              cx="63"
              cy="55"
              r="19"
              fill={`url(#${p9["moon-surface"]})`}
            />

            {/* Western Continent */}
            <path
              d="
              M 49 40
              C 55 41, 54 48, 53 47
              S 52 50 53 51
              S 55 55 58 56
              S 59 61 60 62
              S 57 63 57 64
              S 52 62 50 61
              L 30 55
              Z
            "
              fill="#834B0C"
            />
            <circle cx="46" cy="53" r="3" fill="#1D6627" />
            <circle cx="54" cy="59" r="2" fill="#372DF0" />
            <line x1="48" y1="54" x2="53" y2="53" stroke="#AAA" />
            <line x1="47" y1="48" x2="55" y2="49" stroke="#444" />
            {/* NW clouds */}
            <circle cx="54" cy="48" r="3" fill="#DDD" opacity="0.8" />
            <circle cx="56" cy="47" r="2" fill="#DCC" opacity="0.8" />
            <circle cx="58" cy="50" r="4" fill="#CBC" opacity="0.8" />
            <circle cx="60" cy="47" r="2" fill="#DDD" opacity="0.8" />
            <circle cx="62" cy="46" r="3" fill="#CDC" opacity="0.8" />

            {/* Eastern Continent */}
            <path
              d="
              M 85 45
              C 69 47, 62 54, 66 59
              S 65 66, 67 64
              S 65 70, 68 71
              S 68 74, 72 74
              L 85 60
              Z
            "
              fill="#178314"
            />
            <circle cx="72" cy="53" r="6" fill="#846616" />
            {/* Southern clouds */}
            <circle cx="56" cy="64" r="3" fill="#DEC" opacity="0.8" />
            <circle cx="59" cy="60" r="2" fill="#DCC" opacity="0.8" />
            <circle cx="62" cy="65" r="5" fill="#CDC" opacity="0.8" />
            <circle cx="69" cy="66" r="2" fill="#DDD" opacity="0.8" />
            <circle cx="71" cy="63" r="2" fill="#CDD" opacity="0.8" />
            <circle cx="72" cy="69" r="2" fill="#CDD" opacity="0.8" />
          </g>
        </g>

        {/* Planet 10: magenta planet with pale surface lines */}
        <radialGradient id={p10.sheen} cx="40%" cy="40%" r="70%">
          <stop offset="0%" stopColor="white" stopOpacity="0.75" />
          <stop offset="100%" stopColor="rebeccapurple" stopOpacity="0.1" />
        </radialGradient>
        <filter id={p10.blur}>
          <feGaussianBlur stdDeviation="2.65" />
        </filter>
        <clipPath id={p10.clip}>
          <circle cx="50" cy="50" r="33" />
        </clipPath>
        <g id={p10.body}>
          <g filter={`url(#${p10.blur})`} clipPath={`url(#${p10.clip})`}>
            <circle cx="50" cy="50" r="35" fill="#DB25DB" />
            <line
              x1="20"
              y1="65"
              x2="55"
              y2="58"
              stroke="#f2d8f3"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <line
              x1="25"
              y1="71"
              x2="55"
              y2="65"
              stroke="#f2d8f3"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <circle
              cx="58"
              cy="63"
              r="6"
              stroke="#f2d8f3"
              strokeWidth="2"
              fillOpacity="0"
            />
            <line
              x1="64"
              y1="60"
              x2="84"
              y2="56"
              stroke="#f2d8f3"
              strokeWidth="5"
              strokeLinecap="round"
            />
          </g>
          <circle cx="50" cy="50" r="33" fill={`url(#${p10.sheen})`} />
        </g>

        {/* Planet 11: yellow-orange-green banded planet */}
        <linearGradient id={p11.surface} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#DDB32C" stopOpacity="1" />
          <stop offset="0.19" stopColor="#DDB32C" stopOpacity="1" />
          <stop offset="0.19" stopColor="#C9CE3B" stopOpacity="1" />
          <stop offset="0.28" stopColor="#EA9D1F" stopOpacity="1" />
          <stop offset="0.31" stopColor="#989425" stopOpacity="1" />
          <stop offset="0.35" stopColor="#B3BE4B" stopOpacity="1" />
          <stop offset="0.38" stopColor="#B3BE4B" stopOpacity="1" />
          <stop offset="0.44" stopColor="#F2BD2C" stopOpacity="1" />
          <stop offset="0.57" stopColor="#E0D429" stopOpacity="1" />
          <stop offset="0.69" stopColor="#E3B126" stopOpacity="1" />
          <stop offset="0.76" stopColor="#DB8821" stopOpacity="1" />
          <stop offset="0.79" stopColor="#C29029" stopOpacity="1" />
          <stop offset="0.86" stopColor="#B2D435" stopOpacity="1" />
          <stop offset="1" stopColor="#E5AB24" stopOpacity="1" />
        </linearGradient>
        <radialGradient id={p11.sheen} cx="40%" cy="40%" r="70%">
          <stop offset="0%" stopColor="white" stopOpacity="0.55" />
          <stop offset="100%" stopColor="rebeccapurple" stopOpacity="0.1" />
        </radialGradient>
        <filter id={p11.blur}>
          <feGaussianBlur stdDeviation="1" />
        </filter>
        <clipPath id={p11.clip}>
          <circle cx="50" cy="50" r="34" />
        </clipPath>
        <g id={p11.body}>
          <g
            transform="rotate(-7,50,50)"
            filter={`url(#${p11.blur})`}
            clipPath={`url(#${p11.clip})`}
          >
            <circle cx="50" cy="50" r="34" fill={`url(#${p11.surface})`} />
            <circle
              cx="50"
              cy="50"
              r="34"
              fill={`url(#${p11.sheen})`}
              transform="rotate(7,50,50)"
            />
          </g>
        </g>

        {/* Planet 12: cream-and-olive crater planet */}
        <radialGradient id={p12.sheen} cx="40%" cy="40%" r="70%">
          <stop offset="0%" stopColor="white" stopOpacity="0.55" />
          <stop offset="100%" stopColor="rebeccapurple" stopOpacity="0.1" />
        </radialGradient>
        <filter id={p12.blur}>
          <feGaussianBlur stdDeviation="2.1" />
        </filter>
        <clipPath id={p12.clip}>
          <circle cx="50" cy="50" r="32" />
        </clipPath>
        <g id={p12.body}>
          <g filter={`url(#${p12.blur})`} clipPath={`url(#${p12.clip})`}>
            <circle cx="50" cy="50" r="36" fill="#E6E8BA" />
            <g transform="translate(35 35) rotate(-45 0 0) scale(1.2 1)">
              <circle cx="0" cy="0" r="6" fill="#C9D69A" stroke="#9A7909" />
            </g>
            <g transform="translate(68 42) rotate(60 0 0) scale(1.1 1)">
              <circle cx="0" cy="0" r="9" fill="#C6C88A" stroke="#9A7909" />
            </g>
            <g transform="translate(41 43)">
              <circle cx="0" cy="0" r="6" fill="#B6A87A" stroke="#9A7909" />
            </g>
            <g transform="translate(51 25) scale(1.5 1)">
              <circle cx="0" cy="0" r="3" fill="#DFDACF" stroke="#999" />
            </g>
            <g transform="translate(31 61) rotate(135 0 0) scale(1 1.5)">
              <circle cx="0" cy="0" r="3" fill="#CECE9C" stroke="#AC9A0C" />
            </g>
            <g transform="translate(47 70) scale(1.3 1)">
              <circle cx="0" cy="0" r="6" fill="#C9D69A" stroke="#9A7909" />
            </g>
          </g>
          <circle cx="50" cy="50" r="32" fill={`url(#${p12.sheen})`} />
        </g>

        {/* Planet 13: cyan-purple-pink wavy planet - three stacked wave
            bands, each sliding cyan -> blue -> purple from trough to
            crest */}
        <linearGradient id={p13["band-1"]} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#16d9e9" />
          <stop offset="25%" stopColor="#2eaad1" />
          <stop offset="50%" stopColor="#4f84b0" />
          <stop offset="75%" stopColor="#874eb1" />
          <stop offset="100%" stopColor="#5300df" />
        </linearGradient>
        <linearGradient id={p13["band-2"]} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#e1e0f6" />
          <stop offset="25%" stopColor="#bcc2e5" />
          <stop offset="50%" stopColor="#8eafd0" />
          <stop offset="75%" stopColor="#45a3ba" />
          <stop offset="100%" stopColor="#2db0d2" />
        </linearGradient>
        <linearGradient id={p13["band-3"]} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#ececeb" />
          <stop offset="25%" stopColor="#cebbcb" />
          <stop offset="50%" stopColor="#b79bb2" />
          <stop offset="75%" stopColor="#c47ebb" />
          <stop offset="100%" stopColor="#b763ad" />
        </linearGradient>
        <radialGradient id={p13.sheen} cx="40%" cy="40%" r="70%">
          <stop offset="0%" stopColor="white" stopOpacity="0.55" />
          <stop offset="100%" stopColor="rebeccapurple" stopOpacity="0.1" />
        </radialGradient>
        <filter id={p13.blur}>
          <feGaussianBlur stdDeviation="3.75" />
        </filter>
        <clipPath id={p13.clip}>
          <circle cx="50" cy="50" r="43" />
        </clipPath>
        <g id={p13.body}>
          <g filter={`url(#${p13.blur})`} clipPath={`url(#${p13.clip})`}>
            {/* band 1 (bottom) */}
            <path
              d="M-10,64 Q0,51 8,62 Q17,75 30,66 Q43,48 50,63 Q59,78 72,66 Q84,54 92,64 Q101,76 110,64
                 L110,96 L-10,96 Z"
              fill={`url(#${p13["band-1"]})`}
            />
            {/* band 2 (middle) */}
            <path
              d="M-10,36 Q-2,27 4,34 Q11,45 16,38 Q21,26 30,35 Q39,43 44,37 Q50,30 58,34 Q67,47 72,38 Q79,29 90,36 Q100,44 110,36
                 L110,64 Q101,76 92,64 Q84,54 72,66 Q59,78 50,63 Q43,48 30,66 Q17,75 8,62 Q0,51 -10,64 Z"
              fill={`url(#${p13["band-2"]})`}
            />
            {/* band 3 (top) */}
            <path
              d="M-10,6 L110,6 L110,36
                 Q100,44 90,36 Q79,29 72,38 Q67,47 58,34 Q50,30 44,37 Q39,43 30,35 Q21,26 16,38 Q11,45 4,34 Q-2,27 -10,36 Z"
              fill={`url(#${p13["band-3"]})`}
            />
          </g>
          <circle cx="50" cy="50" r="43" fill={`url(#${p13.sheen})`} />
        </g>

        {/* Planet 14: blue-teal ringed planet with a gold core */}
        <radialGradient id={p14.sheen} cx="40%" cy="40%" r="70%">
          <stop offset="0%" stopColor="white" stopOpacity="0.75" />
          <stop offset="100%" stopColor="rebeccapurple" stopOpacity="0.1" />
        </radialGradient>
        <radialGradient
          id={p14.ring}
          gradientUnits="userSpaceOnUse"
          cx="0"
          cy="0"
          r="48"
        >
          <stop offset="0.45" stopColor="#5EB0E0" />
          <stop offset="0.60" stopColor="#59E3CE" />
          <stop offset="0.68" stopColor="#1A4996" />
          <stop offset="0.79" stopColor="#4A7499" />
          <stop offset="0.90" stopColor="#7DF0EA" />
          <stop offset="1" stopColor="#79E9ED" />
        </radialGradient>
        <g id={p14["ring-whole"]} transform="translate(50,50) scale(1,0.2)">
          <circle
            r="36"
            fill="none"
            stroke={`url(#${p14.ring})`}
            strokeWidth="24"
          />
        </g>
        <clipPath id={p14["ring-back"]}>
          <rect x="0" y="0" width="100" height="50" />
        </clipPath>
        <clipPath id={p14["ring-front"]}>
          <rect x="0" y="49.6" width="100" height="50.4" />
        </clipPath>
        <g id={p14.body} transform="rotate(18, 50, 50)">
          <use
            href={`#${p14["ring-whole"]}`}
            clipPath={`url(#${p14["ring-back"]})`}
          />
          <circle cx="50" cy="50" r="15" fill="#A1962F" />
          <circle cx="50" cy="50" r="15" fill={`url(#${p14.sheen})`} />
          <use
            href={`#${p14["ring-whole"]}`}
            clipPath={`url(#${p14["ring-front"]})`}
          />
        </g>
      </defs>
    </svg>
  );
}
