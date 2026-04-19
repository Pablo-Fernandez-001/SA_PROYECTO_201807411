import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { paymentAPI, fxAPI, ordersAPI } from "../services/api";
import useAuthStore from "../stores/authStore";

const CURRENCIES = [
  "GTQ",
  "USD",
  "EUR",
  "MXN",
  "HNL",
  "CRC",
  "COP",
  "PEN",
  "BRL",
  "GBP",
];

export default function PaymentPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const orderId = searchParams.get("orderId");
  const orderTotal = parseFloat(searchParams.get("total") || "0");

  const getOrderDiscount = (id) => {
    try {
      const raw = localStorage.getItem("order-discounts");
      if (!raw) return 0;
      const data = JSON.parse(raw);
      return data?.[String(id)]?.discountAmount || 0;
    } catch {
      return 0;
    }
  };

  const orderDiscount = orderId ? getOrderDiscount(orderId) : 0;
  const discountedTotal = Math.max(0, orderTotal);
  const originalTotal = orderDiscount > 0 ? orderTotal + orderDiscount : orderTotal;

  const [step, setStep] = useState(1); // 1=select currency, 2=card info, 3=confirm, 4=result
  const [currency, setCurrency] = useState("GTQ");
  const [convertedAmount, setConvertedAmount] = useState(null);
  const [exchangeRate, setExchangeRate] = useState(null);
  const [fxLoading, setFxLoading] = useState(false);
  const [fxError, setFxError] = useState(null);

  // Card form
  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");

  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentResult, setPaymentResult] = useState(null);
  const [paymentError, setPaymentError] = useState(null);

  // Fetch exchange rate when currency changes
  useEffect(() => {
    if (currency === "GTQ") {
      setConvertedAmount(discountedTotal);
      setExchangeRate(1);
      setFxError(null);
      return;
    }
    fetchRate();
  }, [currency, discountedTotal]);

  const fetchRate = async () => {
    setFxLoading(true);
    setFxError(null);
    try {
      const { data } = await fxAPI.convert({
        amount: discountedTotal,
        from_currency: "GTQ",
        to_currency: currency,
      });
      console.log(data);
      setConvertedAmount(data.data?.converted_amount || data.converted_amount);
      setExchangeRate(data.data?.rate || data.rate);
    } catch (err) {
      setFxError(
        "Error obteniendo tipo de cambio: " +
          (err.response?.data?.error || err.message),
      );
      setConvertedAmount(null);
      setExchangeRate(null);
    }
    setFxLoading(false);
  };

  const formatCardNumber = (value) => {
    const digits = value.replace(/\D/g, "").slice(0, 16);
    return digits.replace(/(\d{4})(?=\d)/g, "$1 ");
  };

  const formatExpiry = (value) => {
    const digits = value.replace(/\D/g, "").slice(0, 4);
    if (digits.length > 2) return digits.slice(0, 2) + "/" + digits.slice(2);
    return digits;
  };

  const isCardValid = () => {
    const digits = cardNumber.replace(/\s/g, "");
    return (
      digits.length === 16 &&
      cardName.trim().length > 2 &&
      cardExpiry.length === 5 &&
      cardCvv.length >= 3
    );
  };
  const handlePayment = async () => {
    setPaymentLoading(true);
    setPaymentError(null);

    try {
      // Cambia esto en tu handlePayment
      const payload = {
        orderId: parseInt(orderId),
        userId: parseInt(user.id), // ¡Necesitas enviar esto! (Obtenlo de tu AuthContext o estado)
        amount: orderTotal,
        currency: currency,
        paymentMethod: "CREDIT_CARD", // Cambiado de 'TARJETA' a 'CREDIT_CARD'
        cardLastFour: cardNumber.replace(/\s/g, "").slice(-4),
      };

      // El Proxy (Gateway) se encargará de añadir el userId automáticamente
      const { data } = await paymentAPI.processPayment(payload);

      setPaymentResult(data.data || data);
      setStep(4);
    } catch (err) {
      // Si el error viene del servidor, capturamos el mensaje específico
      setPaymentError(err.response?.data?.error || "Error procesando pago");
    }
    setPaymentLoading(false);
  };
  if (!orderId || !orderTotal) {
    return (
      <div className="max-w-lg mx-auto text-center py-16">
        <p className="text-4xl mb-4">⚠️</p>
        <h2 className="text-xl font-bold text-gray-800 mb-2">
          Parámetros inválidos
        </h2>
        <p className="text-gray-500 mb-4">
          No se especificó una orden para pagar.
        </p>
        <button
          onClick={() => navigate("/my-orders")}
          className="bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700"
        >
          Ir a Mis Pedidos
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Pagar Pedido</h1>
          <p className="text-gray-500 mb-6">
            Orden #{orderId} — Total: Q{discountedTotal.toFixed(2)}
          </p>

      {/* Progress Steps */}
      <div className="flex items-center mb-8">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="flex items-center flex-1">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                step >= s
                  ? "bg-orange-600 text-white"
                  : "bg-gray-200 text-gray-500"
              }`}
            >
              {step > s ? "✓" : s}
            </div>
            {s < 4 && (
              <div
                className={`flex-1 h-1 mx-2 ${step > s ? "bg-orange-600" : "bg-gray-200"}`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Currency Selection */}
      {step === 1 && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-bold mb-4">
            💱 Selecciona la Moneda de Pago
          </h2>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mb-6">
            {CURRENCIES.map((c) => (
              <button
                key={c}
                onClick={() => setCurrency(c)}
                className={`py-3 px-4 rounded-lg font-medium text-sm border-2 transition ${
                  currency === c
                    ? "border-orange-600 bg-orange-50 text-orange-700"
                    : "border-gray-200 hover:border-gray-300 text-gray-600"
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          {/* FX Info */}
          {fxLoading && (
            <div className="text-center py-4">
              <div className="animate-spin h-6 w-6 border-2 border-orange-600 border-t-transparent rounded-full mx-auto" />
              <p className="text-sm text-gray-500 mt-2">
                Consultando tipo de cambio...
              </p>
            </div>
          )}
          {fxError && (
            <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm mb-4">
              {fxError}
            </div>
          )}
          {convertedAmount !== null && !fxLoading && (
            <div className="bg-gradient-to-r from-orange-50 to-yellow-50 border border-orange-200 rounded-xl p-5 mb-4">
              <div className="flex justify-between items-center mb-3">
                <span className="text-gray-600">Monto original (GTQ):</span>
                <span className="font-bold text-lg">
                  Q{originalTotal.toFixed(2)}
                </span>
              </div>
              {orderDiscount > 0 && (
                <div className="flex justify-between items-center mb-3">
                  <span className="text-gray-600">Descuento aplicado:</span>
                  <span className="font-medium text-green-700">
                    -Q{orderDiscount.toFixed(2)}
                  </span>
                </div>
              )}
              {orderDiscount > 0 && (
                <div className="flex justify-between items-center mb-3">
                  <span className="text-gray-700 font-medium">
                    Subtotal con descuento:
                  </span>
                  <span className="font-bold text-lg text-green-700">
                    Q{discountedTotal.toFixed(2)}
                  </span>
                </div>
              )}
              {currency !== "GTQ" && (
                <>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-gray-600">Tipo de cambio:</span>
                    <span className="font-medium">
                      1 GTQ = {Number(exchangeRate).toFixed(6)} {currency}
                    </span>
                  </div>
                  <hr className="my-2 border-orange-200" />
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700 font-medium">
                      Monto a pagar ({currency}):
                    </span>
                    <span className="font-bold text-xl text-orange-700">
                      {Number(convertedAmount).toFixed(2)} {currency}
                    </span>
                  </div>
                </>
              )}
              {currency === "GTQ" && (
                <div className="text-center text-sm text-gray-500">
                  Pago en moneda local, sin conversión
                </div>
              )}
            </div>
          )}

          <button
            onClick={() => setStep(2)}
            disabled={convertedAmount === null || fxLoading}
            className="w-full bg-orange-600 text-white py-3 rounded-lg font-medium hover:bg-orange-700 disabled:opacity-50 transition"
          >
            Continuar al Pago →
          </button>
        </div>
      )}

      {/* Step 2: Card Info */}
      {step === 2 && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-bold mb-4">💳 Datos de la Tarjeta</h2>
          <p className="text-xs text-gray-400 mb-4">
            Simulación — no se almacenan datos reales de tarjeta
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Número de Tarjeta
              </label>
              <input
                type="text"
                value={cardNumber}
                onChange={(e) =>
                  setCardNumber(formatCardNumber(e.target.value))
                }
                placeholder="4242 4242 4242 4242"
                maxLength={19}
                className="w-full border-2 rounded-lg px-4 py-3 text-lg tracking-wider focus:border-orange-500 focus:ring-0 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre del Titular
              </label>
              <input
                type="text"
                value={cardName}
                onChange={(e) => setCardName(e.target.value)}
                placeholder="Juan Pérez"
                className="w-full border-2 rounded-lg px-4 py-3 focus:border-orange-500 focus:ring-0 outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha de Expiración
                </label>
                <input
                  type="text"
                  value={cardExpiry}
                  onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                  placeholder="MM/YY"
                  maxLength={5}
                  className="w-full border-2 rounded-lg px-4 py-3 focus:border-orange-500 focus:ring-0 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CVV
                </label>
                <input
                  type="password"
                  value={cardCvv}
                  onChange={(e) =>
                    setCardCvv(e.target.value.replace(/\D/g, "").slice(0, 4))
                  }
                  placeholder="123"
                  maxLength={4}
                  className="w-full border-2 rounded-lg px-4 py-3 focus:border-orange-500 focus:ring-0 outline-none"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={() => setStep(1)}
              className="flex-1 border-2 py-3 rounded-lg font-medium hover:bg-gray-50 transition"
            >
              ← Atrás
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={!isCardValid()}
              className="flex-1 bg-orange-600 text-white py-3 rounded-lg font-medium hover:bg-orange-700 disabled:opacity-50 transition"
            >
              Revisar Pago →
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Confirmation */}
      {step === 3 && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-bold mb-4">📋 Confirmar Pago</h2>

          <div className="space-y-3 mb-6">
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">Pedido:</span>
              <span className="font-medium">#{orderId}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">Monto original:</span>
              <span className="font-medium">Q{orderTotal.toFixed(2)} GTQ</span>
            </div>
            {currency !== "GTQ" && (
              <>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">Tipo de cambio:</span>
                  <span className="font-medium">
                    1 GTQ = {Number(exchangeRate).toFixed(6)} {currency}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">Monto a cobrar:</span>
                  <span className="font-bold text-orange-700">
                    {Number(convertedAmount).toFixed(2)} {currency}
                  </span>
                </div>
              </>
            )}
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">Tarjeta:</span>
              <span className="font-medium">
                **** **** **** {cardNumber.replace(/\s/g, "").slice(-4)}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">Titular:</span>
              <span className="font-medium">{cardName}</span>
            </div>
          </div>

          {paymentError && (
            <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm mb-4">
              {paymentError}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setStep(2)}
              className="flex-1 border-2 py-3 rounded-lg font-medium hover:bg-gray-50 transition"
            >
              ← Editar
            </button>
            <button
              onClick={handlePayment}
              disabled={paymentLoading}
              className="flex-1 bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 disabled:opacity-50 transition"
            >
              {paymentLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                  Procesando...
                </span>
              ) : (
                `💰 Pagar ${currency !== "GTQ" ? Number(convertedAmount).toFixed(2) + " " + currency : "Q" + orderTotal.toFixed(2)}`
              )}
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Result */}
      {step === 4 && paymentResult && (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-green-700 mb-2">
            ¡Pago Exitoso!
          </h2>
          <p className="text-gray-500 mb-6">
            Tu pedido ha sido pagado correctamente.
          </p>

          <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-left mb-6 max-w-md mx-auto">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Número de Pago:</span>
                <span className="font-mono font-medium">
                  {paymentResult.payment_number ||
                    paymentResult.paymentNumber ||
                    "-"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Transacción:</span>
                <span className="font-mono font-medium">
                  {paymentResult.transaction_id ||
                    paymentResult.transactionId ||
                    "-"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Monto:</span>
                <span className="font-bold text-green-700">
                  {currency !== "GTQ"
                    ? `${Number(convertedAmount).toFixed(2)} ${currency}`
                    : `Q${orderTotal.toFixed(2)}`}
                </span>
              </div>
              {paymentResult.amount_usd && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Equivalente USD:</span>
                  <span className="font-medium">
                    ${Number(paymentResult.amount_usd).toFixed(2)}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">Estado:</span>
                <span className="text-green-700 font-medium">
                  {paymentResult.status || "COMPLETADO"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-3 justify-center">
            <button
              onClick={() => navigate("/my-orders")}
              className="bg-orange-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-orange-700 transition"
            >
              Ver Mis Pedidos
            </button>
            <button
              onClick={() => navigate("/")}
              className="border-2 px-8 py-3 rounded-lg font-medium hover:bg-gray-50 transition"
            >
              Seguir Comprando
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
