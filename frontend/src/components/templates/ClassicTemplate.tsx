import type { TemplateProps } from "./types";

/**
 * Classic Invoice Template
 *
 * Matches the "Gujarat Freight Tools" reference image:
 *  - Company header with logo area, tagline banner
 *  - Customer detail & invoice meta side-by-side
 *  - Item table with HSN, Qty, Rate, Taxable
 *  - Tax breakdown by HSN
 *  - Bank details + signature block
 *  - Terms and conditions
 *
 * Designed for A4 printing. Uses only inline styles to be
 * completely self-contained and print-safe.
 */
export default function ClassicTemplate({ data }: TemplateProps) {
  const border = "1px solid #333";
  const cellPad = "6px 8px";
  const fontSize = "11px";
  const headerBg = "#f0f4f8";

  return (
    <div
      className="print-area"
      style={{
        width: "210mm",
        minHeight: "297mm",
        margin: "0 auto",
        padding: "12mm",
        fontFamily: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
        fontSize,
        color: "#1a1a1a",
        background: "#fff",
        boxSizing: "border-box",
        lineHeight: 1.45,
      }}
    >
      {/* ═══════════ COMPANY HEADER ═══════════ */}
      <div style={{ marginBottom: 0 }}>
        {/* Company Name */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ flex: 1 }}>
            <h1
              style={{
                margin: 0,
                fontSize: "22px",
                fontWeight: 900,
                letterSpacing: "0.5px",
                color: "#111",
                fontFamily: "'Georgia', 'Times New Roman', serif",
              }}
            >
              {data.company.name.toUpperCase()}
            </h1>
            {data.company.tagline && (
              <div
                style={{
                  display: "inline-block",
                  marginTop: "4px",
                  padding: "3px 10px",
                  background: "#173728",
                  color: "#fff",
                  fontSize: "9px",
                  fontWeight: 600,
                  letterSpacing: "0.3px",
                }}
              >
                {data.company.tagline}
              </div>
            )}
          </div>
          {/* Logo placeholder */}
          {data.company.logoUrl ? (
            <img
              src={data.company.logoUrl}
              alt="Company Logo"
              style={{ maxHeight: "55px", maxWidth: "120px", objectFit: "contain" }}
            />
          ) : (
            <div
              style={{
                width: "90px",
                height: "50px",
                border: "1px dashed #bbb",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "8px",
                color: "#999",
                borderRadius: "4px",
              }}
            >
              LOGO
            </div>
          )}
        </div>

        {/* Address + Contact row */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: "6px",
            fontSize: "10px",
            color: "#444",
          }}
        >
          <div style={{ whiteSpace: "pre-line", lineHeight: 1.5 }}>{data.company.address}</div>
          <div style={{ textAlign: "right", lineHeight: 1.5 }}>
            {data.company.phone && <div>Tel : {data.company.phone}</div>}
            {data.company.website && <div>Web : {data.company.website}</div>}
            {data.company.email && <div>Web : {data.company.email}</div>}
          </div>
        </div>
      </div>

      {/* ═══════════ MAIN TABLE WRAPPER ═══════════ */}
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          border,
          marginTop: "8px",
          tableLayout: "fixed",
        }}
      >
        <tbody>
          {/* ── PAN + TYPE + COPY LABEL ── */}
          <tr>
            <td style={{ border, padding: cellPad, width: "33%", fontWeight: 700 }}>
              <span style={{ fontWeight: 700 }}>PAN : </span>
              {data.company.pan}
            </td>
            <td
              style={{
                border,
                padding: cellPad,
                width: "34%",
                textAlign: "center",
                fontSize: "15px",
                fontWeight: 800,
                letterSpacing: "0.5px",
              }}
            >
              {data.type}
            </td>
            <td
              style={{
                border,
                padding: cellPad,
                width: "33%",
                textAlign: "right",
                fontSize: "9px",
                fontWeight: 700,
                color: "#555",
                letterSpacing: "0.3px",
              }}
            >
              {data.copyLabel}
            </td>
          </tr>

          {/* ── CUSTOMER + INVOICE META ── */}
          <tr>
            {/* Customer Detail */}
            <td style={{ border, padding: cellPad, verticalAlign: "top" }}>
              <div style={{ fontSize: "9px", fontWeight: 700, color: "#666", marginBottom: "4px", letterSpacing: "0.3px" }}>
                Customer Detail
              </div>
              <table style={{ width: "100%", fontSize: "10px" }}>
                <tbody>
                  <tr>
                    <td style={{ padding: "2px 0", fontWeight: 700, width: "85px", verticalAlign: "top" }}>M/S</td>
                    <td style={{ padding: "2px 0" }}>{data.party.name}</td>
                  </tr>
                  {data.party.address && (
                    <tr>
                      <td style={{ padding: "2px 0", fontWeight: 700, verticalAlign: "top" }}>Address</td>
                      <td style={{ padding: "2px 0" }}>{data.party.address}</td>
                    </tr>
                  )}
                  {data.party.phone && (
                    <tr>
                      <td style={{ padding: "2px 0", fontWeight: 700 }}>Phone</td>
                      <td style={{ padding: "2px 0" }}>{data.party.phone}</td>
                    </tr>
                  )}
                  {data.party.gstin && (
                    <tr>
                      <td style={{ padding: "2px 0", fontWeight: 700 }}>GSTIN</td>
                      <td style={{ padding: "2px 0" }}>{data.party.gstin}</td>
                    </tr>
                  )}
                  {data.party.placeOfSupply && (
                    <tr>
                      <td style={{ padding: "2px 0", fontWeight: 700, whiteSpace: "nowrap" }}>Place of Supply</td>
                      <td style={{ padding: "2px 0" }}>{data.party.placeOfSupply}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </td>

            {/* Invoice Metadata */}
            <td colSpan={2} style={{ border, padding: cellPad, verticalAlign: "top" }}>
              <table style={{ width: "100%", fontSize: "10px" }}>
                <tbody>
                  <tr>
                    <td style={{ padding: "2px 4px", fontWeight: 700, width: "35%" }}>Invoice No.</td>
                    <td style={{ padding: "2px 4px", width: "30%" }}>{data.invoiceNumber}</td>
                    <td style={{ padding: "2px 4px", fontWeight: 700, width: "15%" }}>Invoice Date</td>
                    <td style={{ padding: "2px 4px" }}>{data.invoiceDate}</td>
                  </tr>
                  {data.challanNumber && (
                    <tr>
                      <td style={{ padding: "2px 4px", fontWeight: 700 }}>Challan No</td>
                      <td style={{ padding: "2px 4px" }}>{data.challanNumber}</td>
                      <td style={{ padding: "2px 4px", fontWeight: 700 }}>Challan Date</td>
                      <td style={{ padding: "2px 4px" }}>{data.challanDate}</td>
                    </tr>
                  )}
                  {data.eWayBillNo && (
                    <tr>
                      <td style={{ padding: "2px 4px", fontWeight: 700 }}>E-Way Bill No.</td>
                      <td colSpan={3} style={{ padding: "2px 4px" }}>{data.eWayBillNo}</td>
                    </tr>
                  )}
                  {data.transportName && (
                    <tr>
                      <td style={{ padding: "2px 4px", fontWeight: 700 }}>Transport</td>
                      <td colSpan={3} style={{ padding: "2px 4px" }}>{data.transportName}</td>
                    </tr>
                  )}
                  {data.transportId && (
                    <tr>
                      <td style={{ padding: "2px 4px", fontWeight: 700 }}>Transport ID</td>
                      <td colSpan={3} style={{ padding: "2px 4px" }}>{data.transportId}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>

      {/* ═══════════ LINE ITEMS TABLE ═══════════ */}
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          border,
          borderTop: "none",
          tableLayout: "fixed",
        }}
      >
        <thead>
          <tr style={{ background: headerBg }}>
            <th style={{ border, padding: cellPad, width: "6%", textAlign: "center", fontWeight: 700, fontSize: "10px" }}>
              Sr. No.
            </th>
            <th style={{ border, padding: cellPad, width: "32%", textAlign: "left", fontWeight: 700, fontSize: "10px" }}>
              Name of Product / Service
            </th>
            <th style={{ border, padding: cellPad, width: "12%", textAlign: "center", fontWeight: 700, fontSize: "10px" }}>
              HSN / SAC
            </th>
            <th style={{ border, padding: cellPad, width: "10%", textAlign: "center", fontWeight: 700, fontSize: "10px" }}>
              Qty
            </th>
            <th style={{ border, padding: cellPad, width: "15%", textAlign: "right", fontWeight: 700, fontSize: "10px" }}>
              Rate
            </th>
            <th style={{ border, padding: cellPad, width: "17%", textAlign: "right", fontWeight: 700, fontSize: "10px" }}>
              Taxable Value
            </th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((item, idx) => (
            <tr key={idx}>
              <td style={{ border, padding: cellPad, textAlign: "center" }}>{item.srNo}</td>
              <td style={{ border, padding: cellPad, fontWeight: 600 }}>{item.name}</td>
              <td style={{ border, padding: cellPad, textAlign: "center" }}>{item.hsnSac}</td>
              <td style={{ border, padding: cellPad, textAlign: "center" }}>
                {item.quantity} {item.uom}
              </td>
              <td style={{ border, padding: cellPad, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                {formatNum(item.rate)}
              </td>
              <td style={{ border, padding: cellPad, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                {formatNum(item.taxableAmount)}
              </td>
            </tr>
          ))}

          {/* Spacer rows to fill some height */}
          {data.items.length < 8 &&
            Array.from({ length: Math.max(0, 3 - data.items.length) }).map((_, i) => (
              <tr key={`spacer-${i}`}>
                <td style={{ border, padding: cellPad }}>&nbsp;</td>
                <td style={{ border, padding: cellPad }}></td>
                <td style={{ border, padding: cellPad }}></td>
                <td style={{ border, padding: cellPad }}></td>
                <td style={{ border, padding: cellPad }}></td>
                <td style={{ border, padding: cellPad }}></td>
              </tr>
            ))}

          {/* Subtotal row */}
          <tr style={{ background: headerBg }}>
            <td colSpan={3} style={{ border, padding: cellPad }}></td>
            <td style={{ border, padding: cellPad, textAlign: "right", fontWeight: 700 }}></td>
            <td style={{ border, padding: cellPad, textAlign: "right", fontWeight: 700 }}></td>
            <td style={{ border, padding: cellPad, textAlign: "right", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
              {formatNum(data.subtotal)}
            </td>
          </tr>

          {/* Tax rows */}
          {data.igstTotal != null && data.igstTotal > 0 && (
            <tr>
              <td colSpan={5} style={{ border, padding: cellPad, textAlign: "right", fontWeight: 700 }}>
                IGST
              </td>
              <td style={{ border, padding: cellPad, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                {formatNum(data.igstTotal)}
              </td>
            </tr>
          )}
          {data.cgstTotal != null && data.cgstTotal > 0 && (
            <tr>
              <td colSpan={5} style={{ border, padding: cellPad, textAlign: "right", fontWeight: 700 }}>
                CGST
              </td>
              <td style={{ border, padding: cellPad, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                {formatNum(data.cgstTotal)}
              </td>
            </tr>
          )}
          {data.sgstTotal != null && data.sgstTotal > 0 && (
            <tr>
              <td colSpan={5} style={{ border, padding: cellPad, textAlign: "right", fontWeight: 700 }}>
                SGST
              </td>
              <td style={{ border, padding: cellPad, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                {formatNum(data.sgstTotal)}
              </td>
            </tr>
          )}

          {/* Grand Total */}
          <tr style={{ background: "#e8f0e8", fontWeight: 800 }}>
            <td colSpan={3} style={{ border, padding: cellPad, textAlign: "right" }}>Total</td>
            <td style={{ border, padding: cellPad, textAlign: "center" }}>
              {data.items.reduce((s, i) => s + i.quantity, 0)} {data.items[0]?.uom}
            </td>
            <td style={{ border, padding: cellPad }}></td>
            <td style={{ border, padding: cellPad, textAlign: "right", fontSize: "12px", fontVariantNumeric: "tabular-nums" }}>
              ₹ {formatNum(data.grandTotal)}
            </td>
          </tr>
        </tbody>
      </table>

      {/* ═══════════ TOTAL IN WORDS ═══════════ */}
      <table style={{ width: "100%", borderCollapse: "collapse", border, borderTop: "none", tableLayout: "fixed" }}>
        <tbody>
          <tr>
            <td style={{ border, padding: cellPad }}>
              <div style={{ fontSize: "9px", color: "#666" }}>Total in words</div>
              <div style={{ fontWeight: 700, fontSize: "10px", marginTop: "2px" }}>{data.totalInWords}</div>
            </td>
            <td style={{ border, padding: cellPad, textAlign: "right", fontSize: "9px", color: "#666", width: "15%" }}>
              (E &amp; O.E.)
            </td>
          </tr>
        </tbody>
      </table>

      {/* ═══════════ HSN TAX BREAKDOWN ═══════════ */}
      {data.taxBreakdown.length > 0 && (
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            border,
            borderTop: "none",
            tableLayout: "fixed",
          }}
        >
          <thead>
            <tr style={{ background: headerBg }}>
              <th style={{ border, padding: cellPad, textAlign: "left", fontWeight: 700, fontSize: "10px" }}>HSN / SAC</th>
              <th style={{ border, padding: cellPad, textAlign: "right", fontWeight: 700, fontSize: "10px" }}>Taxable Value</th>
              {data.igstTotal != null && data.igstTotal > 0 && (
                <>
                  <th style={{ border, padding: cellPad, textAlign: "center", fontWeight: 700, fontSize: "10px" }}>IGST %</th>
                  <th style={{ border, padding: cellPad, textAlign: "right", fontWeight: 700, fontSize: "10px" }}>IGST Amt</th>
                </>
              )}
              {data.cgstTotal != null && data.cgstTotal > 0 && (
                <>
                  <th style={{ border, padding: cellPad, textAlign: "center", fontWeight: 700, fontSize: "10px" }}>CGST %</th>
                  <th style={{ border, padding: cellPad, textAlign: "right", fontWeight: 700, fontSize: "10px" }}>CGST Amt</th>
                </>
              )}
              {data.sgstTotal != null && data.sgstTotal > 0 && (
                <>
                  <th style={{ border, padding: cellPad, textAlign: "center", fontWeight: 700, fontSize: "10px" }}>SGST %</th>
                  <th style={{ border, padding: cellPad, textAlign: "right", fontWeight: 700, fontSize: "10px" }}>SGST Amt</th>
                </>
              )}
              <th style={{ border, padding: cellPad, textAlign: "right", fontWeight: 700, fontSize: "10px" }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {data.taxBreakdown.map((row, idx) => (
              <tr key={idx}>
                <td style={{ border, padding: cellPad }}>{row.hsnSac}</td>
                <td style={{ border, padding: cellPad, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                  {formatNum(row.taxableValue)}
                </td>
                {data.igstTotal != null && data.igstTotal > 0 && (
                  <>
                    <td style={{ border, padding: cellPad, textAlign: "center" }}>{row.igstRate}</td>
                    <td style={{ border, padding: cellPad, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                      {formatNum(row.igstAmount ?? 0)}
                    </td>
                  </>
                )}
                {data.cgstTotal != null && data.cgstTotal > 0 && (
                  <>
                    <td style={{ border, padding: cellPad, textAlign: "center" }}>{row.cgstRate}</td>
                    <td style={{ border, padding: cellPad, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                      {formatNum(row.cgstAmount ?? 0)}
                    </td>
                  </>
                )}
                {data.sgstTotal != null && data.sgstTotal > 0 && (
                  <>
                    <td style={{ border, padding: cellPad, textAlign: "center" }}>{row.sgstRate}</td>
                    <td style={{ border, padding: cellPad, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                      {formatNum(row.sgstAmount ?? 0)}
                    </td>
                  </>
                )}
                <td style={{ border, padding: cellPad, textAlign: "right", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                  {formatNum(row.totalTax)}
                </td>
              </tr>
            ))}
            {/* Totals row */}
            <tr style={{ fontWeight: 700, background: headerBg }}>
              <td style={{ border, padding: cellPad, textAlign: "right" }}>Total</td>
              <td style={{ border, padding: cellPad, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                {formatNum(data.taxBreakdown.reduce((s, r) => s + r.taxableValue, 0))}
              </td>
              {data.igstTotal != null && data.igstTotal > 0 && (
                <>
                  <td style={{ border, padding: cellPad }}></td>
                  <td style={{ border, padding: cellPad, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                    {formatNum(data.igstTotal)}
                  </td>
                </>
              )}
              {data.cgstTotal != null && data.cgstTotal > 0 && (
                <>
                  <td style={{ border, padding: cellPad }}></td>
                  <td style={{ border, padding: cellPad, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                    {formatNum(data.cgstTotal)}
                  </td>
                </>
              )}
              {data.sgstTotal != null && data.sgstTotal > 0 && (
                <>
                  <td style={{ border, padding: cellPad }}></td>
                  <td style={{ border, padding: cellPad, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                    {formatNum(data.sgstTotal)}
                  </td>
                </>
              )}
              <td style={{ border, padding: cellPad, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                {formatNum(data.taxBreakdown.reduce((s, r) => s + r.totalTax, 0))}
              </td>
            </tr>
          </tbody>
        </table>
      )}

      {/* Tax in words */}
      {data.totalTaxInWords && (
        <div style={{ border, borderTop: "none", padding: cellPad, fontSize: "9px" }}>
          Total Tax in words: <strong>{data.totalTaxInWords}</strong>
        </div>
      )}

      {/* ═══════════ BANK + SIGNATURE ═══════════ */}
      <table style={{ width: "100%", borderCollapse: "collapse", border, borderTop: "none", tableLayout: "fixed" }}>
        <tbody>
          <tr>
            {/* Bank Details */}
            <td style={{ border, padding: cellPad, width: "50%", verticalAlign: "top" }}>
              <div style={{ textAlign: "center", fontWeight: 700, fontSize: "10px", marginBottom: "6px", borderBottom: border, paddingBottom: "4px" }}>
                Bank Details
              </div>
              {data.bankDetails && (
                <table style={{ width: "100%", fontSize: "10px" }}>
                  <tbody>
                    <tr>
                      <td style={{ padding: "2px 0", fontWeight: 700, width: "90px" }}>Name</td>
                      <td style={{ padding: "2px 0" }}>{data.bankDetails.bankName}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: "2px 0", fontWeight: 700 }}>Branch</td>
                      <td style={{ padding: "2px 0" }}>{data.bankDetails.branch}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: "2px 0", fontWeight: 700 }}>Acc. Number</td>
                      <td style={{ padding: "2px 0" }}>{data.bankDetails.accountNumber}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: "2px 0", fontWeight: 700 }}>IFSC</td>
                      <td style={{ padding: "2px 0" }}>{data.bankDetails.ifsc}</td>
                    </tr>
                    {data.bankDetails.upiId && (
                      <tr>
                        <td style={{ padding: "2px 0", fontWeight: 700 }}>UPI ID</td>
                        <td style={{ padding: "2px 0" }}>{data.bankDetails.upiId}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </td>

            {/* Signature Block */}
            <td style={{ border, padding: cellPad, width: "50%", verticalAlign: "top" }}>
              <div style={{ fontSize: "9px", color: "#666", marginBottom: "4px" }}>
                Certified that the particulars given above are true and correct.
              </div>
              <div style={{ fontWeight: 700, fontSize: "11px", marginBottom: "4px" }}>
                For {data.company.name}
              </div>
              <div style={{ height: "45px" }}></div>
              <div style={{ fontSize: "9px", color: "#666", fontStyle: "italic", marginBottom: "6px" }}>
                This is a computer generated invoice, no signature required.
              </div>
              <div style={{ textAlign: "right", fontSize: "10px", fontWeight: 700, borderTop: border, paddingTop: "4px" }}>
                Authorised Signatory
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* ═══════════ TERMS & CONDITIONS ═══════════ */}
      {data.termsAndConditions && data.termsAndConditions.length > 0 && (
        <table style={{ width: "100%", borderCollapse: "collapse", border, borderTop: "none", tableLayout: "fixed" }}>
          <tbody>
            <tr>
              <td style={{ border, padding: cellPad, verticalAlign: "top" }}>
                <div style={{ fontWeight: 700, fontSize: "10px", textAlign: "center", marginBottom: "4px", borderBottom: border, paddingBottom: "3px" }}>
                  Terms and Conditions
                </div>
                <ul style={{ margin: 0, paddingLeft: "14px", fontSize: "9px", color: "#555", lineHeight: 1.6 }}>
                  {data.termsAndConditions.map((term, idx) => (
                    <li key={idx}>{term}</li>
                  ))}
                </ul>
              </td>
              <td style={{ border, padding: cellPad, width: "50%" }}>
                <div style={{ fontWeight: 700, fontSize: "10px", marginBottom: "4px" }}>Customer Signature</div>
                <div style={{ height: "30px" }}></div>
              </td>
            </tr>
          </tbody>
        </table>
      )}

      {/* Footer */}
      <div style={{ textAlign: "center", marginTop: "8px", fontSize: "9px", color: "#888" }}>
        Thank you for shopping with us!
      </div>
    </div>
  );
}

/** Format a number to Indian-style with 2 decimal places */
function formatNum(n: number): string {
  return n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
