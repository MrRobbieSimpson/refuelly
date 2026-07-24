/** Icons & logo paths from Figma Make / design assets */

const paths = {
  logoR:
    "M2.7965 24.3296H0V6.85146H2.7965V9.26344C4.05493 7.6205 6.04744 6.5019 7.79526 6.5019C8.3196 6.5019 8.8789 6.64172 9.22847 6.85146V8.94884H8.03995C4.89388 8.94884 2.7965 11.0113 2.7965 14.1224V24.3296Z",
  logoE:
    "M17.8526 24.6792C12.6091 24.6792 9.07852 21.0437 9.07852 15.5905C9.07852 10.1374 12.6091 6.5019 17.8526 6.5019C23.096 6.5019 26.6266 10.2772 26.6266 15.8702L26.3469 16.1498H11.91C12.0498 19.7853 14.4268 22.2322 17.8526 22.2322C20.4393 22.2322 22.6765 20.6942 23.4456 18.387H26.2421C25.1235 22.1623 21.7677 24.6792 17.8526 24.6792ZM12.0498 13.7029H23.6553C23.0261 10.8714 20.684 8.94884 17.8526 8.94884C15.0211 8.94884 12.679 10.8714 12.0498 13.7029Z",
  logoF:
    "M33.1525 24.3296H30.356V9.29841H27.5595V6.85147H30.356V4.89391C30.356 1.95758 32.2786 2.72259e-05 35.18 2.72259e-05C35.8441 2.72259e-05 36.6132 0.139853 37.0676 0.34959V2.55184H35.3897C34.0614 2.55184 33.1525 3.49566 33.1525 4.89391V6.85147H37.0676V9.29841H33.1525V24.3296Z",
  logoU:
    "M51.1815 6.85145H53.978V24.3296H51.1815V22.0924C49.958 23.6305 47.7558 24.6792 45.7283 24.6792C41.3588 24.6792 38.4574 21.8827 38.4574 17.6879V6.85145H41.2539V17.1985C41.2539 20.2048 43.2464 22.2322 46.2177 22.2322C49.189 22.2322 51.1815 20.2048 51.1815 17.1985V6.85145Z",
  logoE2:
    "M65.4245 24.6792C60.1811 24.6792 56.6505 21.0437 56.6505 15.5905C56.6505 10.1374 60.1811 6.5019 65.4245 6.5019C70.668 6.5019 74.1986 10.2772 74.1986 15.8702L73.9189 16.1498H59.482C59.6218 19.7853 61.9988 22.2322 65.4245 22.2322C68.0113 22.2322 70.2485 20.6942 71.0176 18.387H73.8141C72.6955 22.1623 69.3396 24.6792 65.4245 24.6792ZM59.6218 13.7029H71.2273C70.5981 10.8714 68.256 8.94884 65.4245 8.94884C62.5931 8.94884 60.251 10.8714 59.6218 13.7029Z",
  logoL: "M79.6594 24.3296H76.8629V0.349578H79.6594V24.3296Z",
  logoL2: "M86.6411 24.3296H83.8446V0.349578H86.6411V24.3296Z",
  logoY:
    "M95.5618 30.8315H92.5555L95.5268 23.2809L88.8851 6.85145H91.8564L96.96 19.6804L101.994 6.85145H105L95.5618 30.8315Z",
  contactlessFrame:
    "M3.8147e-06 2.2302C3.8147e-06 0.998458 0.998462 0 2.23005 0H16.5029C17.7345 0 18.7329 0.998458 18.7329 2.2302V9.36624C18.7329 10.598 17.7345 11.5964 16.5029 11.5964H2.23005C0.998462 11.5964 3.8147e-06 10.598 3.8147e-06 9.36624V2.2302ZM2.23005 0.89214C1.49113 0.89214 0.891991 1.49113 0.891991 2.2302V9.36624C0.891991 10.1053 1.49113 10.7043 2.23005 10.7043H16.5029C17.2418 10.7043 17.841 10.1053 17.841 9.36624V2.2302C17.841 1.49113 17.2418 0.89214 16.5029 0.89214H2.23005Z",
  contactlessWave1:
    "M12.9344 7.13627C12.4417 7.13627 12.0424 7.53559 12.0424 8.02826C12.0424 8.52093 12.4417 8.9204 12.9344 8.9204C13.2197 8.9204 13.4735 8.78704 13.6375 8.57752L14.34 9.12723C14.0141 9.5436 13.5055 9.81239 12.9344 9.81239C11.9491 9.81239 11.1504 9.01357 11.1504 8.02827C11.1504 7.04296 11.9491 6.24429 12.9344 6.24429C13.4629 6.24429 13.9381 6.47457 14.2641 6.83881L13.5994 7.43375C13.4356 7.25051 13.1986 7.13627 12.9344 7.13627Z",
  contactlessWave2:
    "M15.1648 7.13627C14.6721 7.13627 14.2726 7.53559 14.2726 8.02826C14.2726 8.52093 14.6721 8.9204 15.1648 8.9204C15.6574 8.9204 16.0568 8.52093 16.0568 8.02826C16.0568 7.53559 15.6574 7.13627 15.1648 7.13627ZM13.3806 8.02826C13.3806 7.04295 14.1795 6.24429 15.1648 6.24429C16.1501 6.24429 16.9487 7.04295 16.9487 8.02826C16.9487 9.01357 16.1501 9.81239 15.1648 9.81239C14.1795 9.81239 13.3806 9.01357 13.3806 8.02826Z",
  contactlessBar:
    "M0 3.1221C0 2.87585 0.199665 2.67603 0.44607 2.67603H18.2866C18.533 2.67603 18.7326 2.87585 18.7326 3.1221C18.7326 3.36836 18.533 3.56817 18.2866 3.56817H0.44607C0.199665 3.56817 0 3.36836 0 3.1221Z",
  bolt: "M8.94766 4.37405C8.88017 4.29338 8.75708 4.24406 8.6251 4.24406H5.24972V0.26488C5.24972 0.143399 5.13343 0.0378321 4.96771 0.00812801C4.80198 -0.0215714 4.62789 0.0319984 4.54612 0.138122L0.0456128 5.97425C-0.0174344 6.05595 -0.0150807 6.15624 0.0524141 6.23636C0.119125 6.31704 0.242212 6.36635 0.374194 6.36635H3.74957V10.3455C3.74957 10.467 3.86586 10.5726 4.03159 10.6023C4.06233 10.6081 4.09385 10.6108 4.12459 10.6108C4.25958 10.6108 4.38711 10.5588 4.45382 10.4723L8.95432 4.63616C9.01737 4.55446 9.01515 4.45417 8.94766 4.37405ZM4.49973 9.30516V6.10121C4.49973 5.95474 4.33165 5.83595 4.12472 5.83595L1.00581 5.83586L4.49973 1.30552V4.50947C4.49973 4.65593 4.66781 4.77472 4.87474 4.77472H7.99365L4.49973 9.30516Z",
  mapView:
    "M2.41667 5.75L0.75 10.75L2.27991 15.3397C2.36158 15.5847 2.59086 15.75 2.84912 15.75H14.9175C15.3271 15.75 15.6163 15.3488 15.4868 14.9603L14.0833 10.75M2.41667 5.75L1.01325 1.53974C0.883739 1.15122 1.17292 0.75 1.58246 0.75L13.6509 0.75C13.9091 0.75 14.1384 0.915258 14.2201 1.16026L15.75 5.75L14.0833 10.75M14.0833 10.75H0.75M15.75 5.75H2.41667",
  plus: "M0.75 5.75H5.75M10.75 5.75H5.75M5.75 5.75V0.75M5.75 5.75V10.75",
  mapPin:
    "M17.675 1.11963C17.8781 1.25804 18 1.48635 18 1.73011V12.1108C18 12.3919 17.8063 12.6947 17.5156 12.8028L12.2656 14.7801C12.1063 14.8419 11.9281 14.845 11.7625 14.7925L6.01562 12.8986L1.01688 14.7801C0.786563 14.8666 0.5275 14.8357 0.324375 14.6998C0.121312 14.5608 0 14.3321 0 14.0881V3.70739C0 3.39844 0.192187 3.12347 0.483125 3.01441L5.73438 1.03714C5.89375 0.976278 6.07188 0.972571 6.2375 1.02664L11.9844 2.92018L16.9844 1.03714C17.2125 0.950327 17.4719 0.981222 17.675 1.11963ZM1.5 13.0129L5.25 11.601V2.80618L1.5 4.21715V13.0129ZM11.25 4.24187L6.75 2.75891V11.5763L11.25 13.0593V4.24187ZM12.75 13.0129L16.5 11.601V2.80618L12.75 4.21715V13.0129Z",
} as const;

export function Logo() {
  return (
    <svg
      width="105"
      height="31"
      viewBox="0 0 105 30.8315"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="refuelly"
      role="img"
    >
      <path d={paths.logoR} fill="white" />
      <path d={paths.logoE} fill="white" />
      <path d={paths.logoF} fill="white" />
      <path d={paths.logoU} fill="white" />
      <path d={paths.logoE2} fill="white" />
      <path d={paths.logoL} fill="white" />
      <path d={paths.logoL2} fill="white" />
      <path d={paths.logoY} fill="white" />
    </svg>
  );
}

export function ContactlessIcon() {
  return (
    <svg width="19" height="12" viewBox="0 0 18.7329 11.5964" fill="none" aria-hidden>
      <path fillRule="evenodd" clipRule="evenodd" d={paths.contactlessFrame} fill="#AB86C1" />
      <path fillRule="evenodd" clipRule="evenodd" d={paths.contactlessWave1} fill="#AB86C1" />
      <path fillRule="evenodd" clipRule="evenodd" d={paths.contactlessWave2} fill="#AB86C1" />
      <path fillRule="evenodd" clipRule="evenodd" d={paths.contactlessBar} fill="#AB86C1" />
    </svg>
  );
}

export function EvBoltIcon() {
  return (
    <svg width="9" height="11" viewBox="0 0 9 10.6108" fill="none" aria-hidden>
      <path d={paths.bolt} fill="#34D399" />
    </svg>
  );
}

export function MapViewIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 16.5 16.5" fill="none" aria-hidden>
      <path
        d={paths.mapView}
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PlusIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 11.5 11.5" fill="none" aria-hidden>
      <path
        d={paths.plus}
        stroke="#141C25"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function MapPinGlyph() {
  return (
    <svg width="18" height="15.82" viewBox="0 0 18 15.8182" fill="none" aria-hidden>
      <path d={paths.mapPin} fill="white" />
    </svg>
  );
}

export function ScrollCornerIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 8.25737 8.25737" fill="none" aria-hidden>
      <path d="M7.75737 0V7.75737H0" stroke="#4E5DC8" />
    </svg>
  );
}

export function ShopIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M2 6h12l-1 8H3L2 6Zm1.5-3h9L14 6H2l1.5-3Z"
        stroke="#9e9e9e"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CarWashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M2 11h12M3.5 11l1-5h7l1 5M5 6V4.5A1.5 1.5 0 0 1 6.5 3h3A1.5 1.5 0 0 1 11 4.5V6"
        stroke="#9e9e9e"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="5.5" cy="12.5" r="1" fill="#9e9e9e" />
      <circle cx="10.5" cy="12.5" r="1" fill="#9e9e9e" />
    </svg>
  );
}

export function ToiletsIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="5" cy="4" r="1.5" stroke="#9e9e9e" strokeWidth="1.2" />
      <path
        d="M3.5 7h3v5.5H5.5V14h-1v-1.5H3.5V7Z"
        stroke="#9e9e9e"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <circle cx="11" cy="4" r="1.5" stroke="#9e9e9e" strokeWidth="1.2" />
      <path
        d="M9.5 7h3l.5 4h-1V14h-1v-3h-1L9.5 7Z"
        stroke="#9e9e9e"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function AtmIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect
        x="2.5"
        y="2"
        width="11"
        height="12"
        rx="1.5"
        stroke="#9e9e9e"
        strokeWidth="1.3"
      />
      <path d="M5 6h6M5 9h4" stroke="#9e9e9e" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

export function Clock24Icon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="8" cy="8" r="5.5" stroke="#9e9e9e" strokeWidth="1.3" />
      <path
        d="M8 5v3.5l2 1.5"
        stroke="#9e9e9e"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CardGlow() {
  return (
    <div className="pointer-events-none absolute right-[-10px] top-[-10px] h-[71px] w-[71px]">
      <div className="absolute inset-[-211%]">
        <svg width="371" height="371" viewBox="0 0 371 371" fill="none" aria-hidden>
          <g filter="url(#glow_card)">
            <circle cx="185.5" cy="185.5" r="35.5" fill="#525FD1" />
          </g>
          <defs>
            <filter
              id="glow_card"
              x="0"
              y="0"
              width="371"
              height="371"
              filterUnits="userSpaceOnUse"
              colorInterpolationFilters="sRGB"
            >
              <feFlood floodOpacity="0" result="BackgroundImageFix" />
              <feBlend in="SourceGraphic" in2="BackgroundImageFix" mode="normal" result="shape" />
              <feGaussianBlur stdDeviation="75" result="effect1_foregroundBlur" />
            </filter>
          </defs>
        </svg>
      </div>
    </div>
  );
}
