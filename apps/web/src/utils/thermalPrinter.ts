/**
 * Utilitário para geração e impressão de Comanda Térmica (80mm) via CSS e window.print()
 */

export interface PrintOrderData {
  orderId: string;
  customerName: string;
  customerAddress: string;
  items: Array<{ name: string; qty: number; price: number }>;
  total: number;
  paymentMethod: string;
  notes?: string;
  createdAt: string;
}

export const printThermalReceipt = (data: PrintOrderData) => {
  // Constrói o HTML da comanda
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Imprimir Comanda - ${data.orderId}</title>
      <style>
        /* CSS Otimizado para Impressoras Térmicas 80mm */
        @page { margin: 0; }
        body { 
          font-family: 'Courier New', Courier, monospace; 
          width: 80mm; 
          margin: 0; 
          padding: 4mm;
          font-size: 12px;
          line-height: 1.2;
          color: #000;
        }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .text-bold { font-weight: bold; }
        .text-lg { font-size: 16px; }
        .divider { border-bottom: 1px dashed #000; margin: 4px 0; }
        .row { display: flex; justify-content: space-between; }
        .mt-2 { margin-top: 8px; }
        .mb-2 { margin-bottom: 8px; }
      </style>
    </head>
    <body>
      <div class="text-center text-bold text-lg mb-2">RESTAURANTE PARAISÓPOLIS</div>
      <div class="text-center mb-2">CNPJ: 00.000.000/0001-00<br>Praça Cel. José Vieira, Centro<br>Paraisópolis - MG</div>
      
      <div class="divider"></div>
      <div class="text-center text-bold text-lg">PEDIDO #${data.orderId.split('-')[1] || data.orderId}</div>
      <div class="text-center">${new Date(data.createdAt).toLocaleString('pt-BR')}</div>
      <div class="divider"></div>
      
      <div class="text-bold mt-2">CLIENTE:</div>
      <div>${data.customerName}</div>
      <div class="text-bold mt-2">ENDEREÇO (ENTREGA):</div>
      <div>${data.customerAddress}</div>
      
      <div class="divider mt-2"></div>
      <div class="row text-bold">
        <span>QTD ITEM</span>
        <span>VALOR</span>
      </div>
      <div class="divider"></div>
      
      ${data.items.map(item => `
        <div class="row">
          <span>${item.qty}x ${item.name}</span>
          <span>R$ ${(item.price * item.qty).toFixed(2).replace('.', ',')}</span>
        </div>
      `).join('')}
      
      <div class="divider mt-2"></div>
      <div class="row text-bold text-lg">
        <span>TOTAL:</span>
        <span>R$ ${data.total.toFixed(2).replace('.', ',')}</span>
      </div>
      <div class="row mt-2">
        <span>PAGAMENTO:</span>
        <span class="text-bold">${data.paymentMethod}</span>
      </div>
      
      ${data.notes ? `
        <div class="divider mt-2"></div>
        <div class="text-bold">OBSERVAÇÕES:</div>
        <div>${data.notes}</div>
      ` : ''}
      
      <div class="divider mt-2"></div>
      <div class="text-center mt-2 mb-2">
        Agradecemos a preferência!<br>
        Software por DeliveryHub
      </div>
      
      <script>
        // Imprime automaticamente e fecha a janela após a impressão
        window.onload = () => {
          window.print();
          setTimeout(() => { window.close(); }, 500);
        };
      </script>
    </body>
    </html>
  `;

  // Abre uma nova janela invisível/popup para a impressão
  const printWindow = window.open('', '_blank', 'width=400,height=600');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  }
};
