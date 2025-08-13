"use client";
// Wrap QRCodeSVG to avoid React 18/19 type frictions
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { QRCodeSVG } from "qrcode.react";

export default function QRCodeClient(props: { value: string; size?: number }) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  return <QRCodeSVG {...props} />;
}


