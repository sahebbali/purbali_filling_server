import nodemailer from "nodemailer";

export const sendOrderStatusMail = async (order, newStatus, note) => {
  const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0);

  const companyLogo =
    "https://res.cloudinary.com/dogwkdiny/image/upload/v1778731164/products/ntzdu6n8tjt07vgvg6bx.jpg";

  const statusConfig = {
    pending: {
      title: "Order Received",
      message: "We have received your order and it is now under review.",
      subject: `Order Received - Tescon (#${order.orderId})`,
    },
    processing: {
      title: "Order Processing",
      message: "Your order is currently being prepared.",
      subject: `Order Processing - Tescon (#${order.orderId})`,
    },
    shipped: {
      title: "Order Shipped",
      message: "Your order has been shipped and is on the way.",
      subject: `Order Shipped - Tescon (#${order.orderId})`,
    },
    delivered: {
      title: "Order Delivered",
      message: "Your order has been delivered successfully.",
      subject: `Order Delivered - Tescon (#${order.orderId})`,
    },
    cancelled: {
      title: "Order Cancelled",
      message: "Your order has been cancelled.",
      subject: `Order Cancelled - Tescon (#${order.orderId})`,
    },
  };

  const config = statusConfig[newStatus] || statusConfig.pending;

  const transporter = nodemailer.createTransport({
    host: "smtp.hostinger.com",
    port: 465,
    secure: true,
    auth: {
      user: "info@growbizint.com",
      pass: "$JGzq~56k",
    },
  });

  const mailOptions = {
    from: '"Tescon" <info@growbizint.com>',
    to: order.customer.email,
    subject: config.subject,
    html: `
      <div style="margin:0;padding:30px;background:#f5f5f5;font-family:Arial,sans-serif;color:#111;">
        <div style="max-width:600px;margin:auto;background:#ffffff;border:1px solid #ddd;border-radius:8px;padding:35px;">

          <!-- Logo -->
          <div style="text-align:center;margin-bottom:25px;">
            <img src="${companyLogo}" style="max-width:160px;height:auto;" />
          </div>

          <!-- Title -->
          <h2 style="margin:0 0 15px;text-align:center;font-size:24px;color:#111;">
            ${config.title}
          </h2>

          <!-- Order ID -->
          <p style="text-align:center;font-size:15px;color:#555;margin-bottom:25px;">
            Order ID: <strong>#${order.orderId}</strong>
          </p>

          <!-- Greeting -->
          <p style="font-size:15px;line-height:1.6;">
            Dear <strong>${order.customer.name}</strong>,
          </p>

          <!-- Message -->
          <p style="font-size:15px;line-height:1.8;color:#333;">
            ${config.message}
          </p>

          ${
            note
              ? `
            <div style="margin:20px 0;padding:15px;background:#fafafa;border-left:4px solid #111;">
              <strong>Note:</strong><br/>
              ${note}
            </div>
          `
              : ""
          }

          <!-- Summary -->
          <div style="margin-top:25px;padding:20px;background:#fafafa;border:1px solid #eee;border-radius:6px;">
            <table width="100%" cellpadding="6" cellspacing="0">
              <tr>
                <td>Total Items</td>
                <td align="right"><strong>${totalItems}</strong></td>
              </tr>
              <tr>
                <td>Total Amount</td>
                <td align="right"><strong>৳${order.total.toFixed(
                  2,
                )}</strong></td>
              </tr>
              <tr>
                <td>Order Date</td>
                <td align="right">
                  <strong>${new Date(order.createdAt).toLocaleDateString(
                    "en-BD",
                  )}</strong>
                </td>
              </tr>
            </table>
          </div>

          <!-- Buttons -->
          ${
            newStatus === "shipped"
              ? `
            <div style="text-align:center;margin-top:30px;">
              <a href="https://tescon.com/track-order/${order.orderId}"
                 style="display:inline-block;padding:12px 28px;background:#111;color:#fff;text-decoration:none;border-radius:5px;font-size:14px;">
                 Track Order
              </a>
            </div>
          `
              : newStatus === "delivered"
              ? `
            <div style="text-align:center;margin-top:30px;">
              <a href="https://tescon.com/review-order/${order.orderId}"
                 style="display:inline-block;padding:12px 28px;background:#111;color:#fff;text-decoration:none;border-radius:5px;font-size:14px;">
                 Write Review
              </a>
            </div>
          `
              : ""
          }

          <!-- Footer -->
          <div style="margin-top:35px;padding-top:20px;border-top:1px solid #eee;text-align:center;">
            <p style="margin:0;font-size:13px;color:#666;">
              Need help? Contact us at 
              <a href="mailto:support@tescon.com" style="color:#111;text-decoration:none;">
                support@tescon.com
              </a>
            </p>

            <p style="margin-top:12px;font-size:12px;color:#888;">
              © ${new Date().getFullYear()} Tescon. All rights reserved.
            </p>
          </div>

        </div>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Order Status Email Sent:", info.response);
    return true;
  } catch (error) {
    console.error("Order Status Email Error:", error);
    return false;
  }
};
