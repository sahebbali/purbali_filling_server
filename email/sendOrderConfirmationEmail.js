import nodemailer from "nodemailer";

export const sendOrderConfirmationEmail = (order) => {
  // Calculate total items count
  const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0);

  const companyLogo =
    "https://res.cloudinary.com/dogwkdiny/image/upload/v1778731164/products/ntzdu6n8tjt07vgvg6bx.jpg";

  const transporter = nodemailer.createTransport({
    host: "smtp.hostinger.com",
    port: 465,
    secure: true,
    auth: {
      user: "info@growbizint.com",
      pass: "$JGzq~56k",
    },
  });

  // Format items list
  const itemsList = order.items
    .map(
      (item) => `
    <tr style="border-bottom: 1px solid #e0e0e0;">
      <td style="padding: 12px 8px;">
        <div style="font-weight: 500;">${item.name}</div>
        <div style="color: #666; font-size: 12px; margin-top: 4px;">SKU: ${
          item.sku
        }</div>
      </td>
      <td style="padding: 12px 8px; text-align: center;">${item.quantity}</td>
      <td style="padding: 12px 8px; text-align: right;">৳${item.price.toFixed(
        2,
      )}</td>
      <td style="padding: 12px 8px; text-align: right; font-weight: 500;">৳${(
        item.price * item.quantity
      ).toFixed(2)}</td>
    </tr>
  `,
    )
    .join("");

  // Format shipping address
  let shippingAddressText = "Address not provided";
  let shippingPhone = order.customer.phone || "Not provided";
  let shippingName = order.customer.name;

  if (
    order.shippingAddress &&
    Array.isArray(order.shippingAddress) &&
    order.shippingAddress.length > 0
  ) {
    const addr = order.shippingAddress[0];
    const addressParts = [];
    if (addr.street) addressParts.push(addr.street);
    if (addr.city) addressParts.push(addr.city);
    if (addr.state) addressParts.push(addr.state);
    if (addr.postalCode || addr.zipCode)
      addressParts.push(addr.postalCode || addr.zipCode);
    if (addr.country) addressParts.push(addr.country);
    shippingAddressText = addressParts.join(", ");
  }

  const mailOptions = {
    from: '"Tescon" <info@growbizint.com>',
    to: order.customer.email,
    subject: `Order Confirmation - #${order.orderId} | Tescon`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Order Confirmation - Tescon</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #ffffff; color: #000000;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff;">
          <tr>
            <td align="center" style="padding: 40px 20px;">
              <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%;">
                
                <!-- Logo -->
                <tr>
                  <td align="center" style="padding-bottom: 30px;">
                    <img src="${companyLogo}" alt="Tescon" style="max-width: 180px; height: auto;" />
                  </td>
                </tr>
                
                <!-- Header -->
                <tr>
                  <td align="center" style="padding-bottom: 20px;">
                    <h1 style="margin: 0; font-size: 28px; font-weight: 600; letter-spacing: -0.5px;">Order Confirmation</h1>
                    <p style="margin: 10px 0 0; color: #666; font-size: 16px;">Thank you for your purchase!</p>
                  </td>
                </tr>
                
                <!-- Order Number -->
                <tr>
                  <td align="center" style="padding-bottom: 30px;">
                    <div style="background-color: #f5f5f5; padding: 12px 24px; border-radius: 4px; display: inline-block;">
                      <span style="font-size: 14px; color: #666;">Order #</span>
                      <strong style="font-size: 18px; margin-left: 8px;">${
                        order.orderId
                      }</strong>
                    </div>
                  </td>
                </tr>
                
                <!-- Greeting -->
                <tr>
                  <td style="padding-bottom: 20px;">
                    <p style="margin: 0; font-size: 16px; line-height: 1.5;">
                      Dear <strong>${order.customer.name}</strong>,
                    </p>
                    <p style="margin: 15px 0 0; font-size: 16px; line-height: 1.5; color: #444;">
                      We've received your order and it's now being processed. Here are the details:
                    </p>
                  </td>
                </tr>
                
                <!-- Order Summary Table -->
                <tr>
                  <td style="padding: 20px 0;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border: 1px solid #e0e0e0; border-radius: 4px;">
                      <tr style="background-color: #f8f8f8; border-bottom: 1px solid #e0e0e0;">
                        <th style="padding: 12px 8px; text-align: left; font-weight: 600;">Product</th>
                        <th style="padding: 12px 8px; text-align: center; font-weight: 600;">Qty</th>
                        <th style="padding: 12px 8px; text-align: right; font-weight: 600;">Price</th>
                        <th style="padding: 12px 8px; text-align: right; font-weight: 600;">Total</th>
                      </tr>
                      ${itemsList}
                      <!-- Totals -->
                      <tr style="border-top: 2px solid #e0e0e0;">
                        <td colspan="3" style="padding: 12px 8px; text-align: right; font-weight: 500;">Subtotal:</td>
                        <td style="padding: 12px 8px; text-align: right;">৳${order.subtotal.toFixed(
                          2,
                        )}</td>
                      </tr>
                      ${
                        order.discount && order.discount > 0
                          ? `
                      <tr>
                        <td colspan="3" style="padding: 8px 8px; text-align: right; color: #22c55e;">Discount:</td>
                        <td style="padding: 8px 8px; text-align: right; color: #22c55e;">- ৳${order.discount.toFixed(
                          2,
                        )}</td>
                      </tr>
                      `
                          : ""
                      }
                      <tr>
                        <td colspan="3" style="padding: 8px 8px; text-align: right;">Shipping:</td>
                        <td style="padding: 8px 8px; text-align: right;">৳${order.shipping.toFixed(
                          2,
                        )}</td>
                      </tr>
                      <tr>
                        <td colspan="3" style="padding: 8px 8px; text-align: right;">Tax:</td>
                        <td style="padding: 8px 8px; text-align: right;">৳${order.tax.toFixed(
                          2,
                        )}</td>
                      </tr>
                      <tr style="background-color: #f8f8f8;">
                        <td colspan="3" style="padding: 12px 8px; text-align: right; font-weight: 700; font-size: 16px;">Total:</td>
                        <td style="padding: 12px 8px; text-align: right; font-weight: 700; font-size: 16px;">৳${order.total.toFixed(
                          2,
                        )}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
                <!-- Two Column Layout for Shipping & Payment -->
                <tr>
                  <td style="padding: 20px 0;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <!-- Shipping Address -->
                        <td width="50%" style="vertical-align: top; padding-right: 20px;">
                          <div style="border: 1px solid #e0e0e0; border-radius: 4px; padding: 16px;">
                            <h3 style="margin: 0 0 12px; font-size: 16px; font-weight: 600;">📮 Shipping Address</h3>
                            <p style="margin: 0; line-height: 1.5; font-size: 14px; color: #444;">
                              <strong>${shippingName}</strong><br/>
                              ${shippingAddressText}<br/>
                              📞 ${shippingPhone}
                            </p>
                          </div>
                        </td>
                        
                        <!-- Payment Information -->
                        <td width="50%" style="vertical-align: top;">
                          <div style="border: 1px solid #e0e0e0; border-radius: 4px; padding: 16px;">
                            <h3 style="margin: 0 0 12px; font-size: 16px; font-weight: 600;">💳 Payment Details</h3>
                            <p style="margin: 0; line-height: 1.5; font-size: 14px; color: #444;">
                              <strong>Method:</strong> ${order.payment.method.toUpperCase()}<br/>
                              <strong>Transaction ID:</strong> ${
                                order.payment.transactionId
                              }<br/>
                              <strong>Status:</strong> <span style="color: #22c55e;">${order.paymentStatus.toUpperCase()}</span>
                            </p>
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
                <!-- Order Summary Note -->
                <tr>
                  <td style="padding: 10px 0;">
                    <div style="background-color: #f8f8f8; padding: 16px; border-radius: 4px; text-align: center;">
                      <p style="margin: 0; font-size: 14px; color: #666;">
                        📦 <strong>${totalItems}</strong> item${
      totalItems > 1 ? "s" : ""
    } • 
                        🕐 Placed on ${new Date(
                          order.createdAt,
                        ).toLocaleDateString("en-BD")}
                      </p>
                    </div>
                  </td>
                </tr>
                
                ${
                  order.coupons && order.coupons.length > 0
                    ? `
                <!-- Coupon Applied -->
                <tr>
                  <td style="padding: 10px 0;">
                    <div style="border: 1px solid #e0e0e0; border-radius: 4px; padding: 12px 16px; text-align: center;">
                      <p style="margin: 0; font-size: 14px;">
                        🏷️ Coupon <strong>${
                          order.coupons[0].code
                        }</strong> applied • Saved ৳${order.coupons[0].discountAmount.toFixed(
                        2,
                      )}
                      </p>
                    </div>
                  </td>
                </tr>
                `
                    : ""
                }
                
                <!-- What's Next -->
                <tr>
                  <td style="padding: 30px 0 20px;">
                    <h3 style="margin: 0 0 15px; font-size: 18px; font-weight: 600;">What's Next?</h3>
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td width="70" style="vertical-align: top; padding-right: 12px;">
                          <div style="width: 40px; height: 40px; background-color: #f5f5f5; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                            <span style="font-size: 20px;">1</span>
                          </div>
                        </td>
                        <td>
                          <p style="margin: 0; font-weight: 500;">Order Processing</p>
                          <p style="margin: 5px 0 0; font-size: 14px; color: #666;">We'll prepare your items for shipment.</p>
                        </td>
                      </tr>
                      <tr>
                        <td width="70" style="vertical-align: top; padding-right: 12px; padding-top: 15px;">
                          <div style="width: 40px; height: 40px; background-color: #f5f5f5; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                            <span style="font-size: 20px;">2</span>
                          </div>
                        </td>
                        <td style="padding-top: 15px;">
                          <p style="margin: 0; font-weight: 500;">Shipping Confirmation</p>
                          <p style="margin: 5px 0 0; font-size: 14px; color: #666;">You'll receive an email with tracking info once shipped.</p>
                        </td>
                      </tr>
                      <tr>
                        <td width="70" style="vertical-align: top; padding-right: 12px; padding-top: 15px;">
                          <div style="width: 40px; height: 40px; background-color: #f5f5f5; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                            <span style="font-size: 20px;">3</span>
                          </div>
                        </td>
                        <td style="padding-top: 15px;">
                          <p style="margin: 0; font-weight: 500;">Delivery</p>
                          <p style="margin: 5px 0 0; font-size: 14px; color: #666;">Your order will be delivered to your address.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
                <!-- Support Section -->
                <tr>
                  <td style="padding: 20px 0; border-top: 1px solid #e0e0e0;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td align="center" style="padding: 10px 0;">
                          <p style="margin: 0; font-size: 14px; color: #666;">
                            Need help? Contact our support team
                          </p>
                          <p style="margin: 8px 0 0;">
                            <a href="mailto:support@Tescon.com" style="color: #000000; text-decoration: underline;">support@Tescon.com</a>
                            &nbsp;|&nbsp;
                            <a href="tel:+8801234567890" style="color: #000000; text-decoration: underline;">+880 1234 567890</a>
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td align="center" style="padding: 30px 0 20px; border-top: 1px solid #e0e0e0;">
                    <p style="margin: 0 0 10px; font-size: 12px; color: #999;">
                      © ${new Date().getFullYear()} Tescon. All rights reserved.
                    </p>
                    <p style="margin: 0; font-size: 12px; color: #999;">
                      <a href="https://sescon.com" style="color: #999; text-decoration: none;">www.tescon.com</a>
                    </p>
                    <p style="margin: 15px 0 0; font-size: 11px; color: #aaa;">
                      This email was sent to ${order.customer.email}
                    </p>
                  </td>
                </tr>
                
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error("Order Confirmation Email Error:", error);
      return false;
    } else {
      console.log("Order Confirmation Email Sent:", info.response);
      return true;
    }
  });
};
