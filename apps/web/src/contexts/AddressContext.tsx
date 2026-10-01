import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  DEFAULT_PARAISOPOLIS_LOCATION,
  GeocodedLocation,
} from '../services/geocodingService';

export interface DeliveryAddress {
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  cep: string;
  lat: number;
  lng: number;
  formattedAddress: string;
}

interface AddressContextData {
  address: DeliveryAddress;
  setAddress: (addr: DeliveryAddress) => void;
  isAddressModalOpen: boolean;
  openAddressModal: () => void;
  closeAddressModal: () => void;
  formatAddressSummary: (addr: DeliveryAddress) => string;
}

const STORAGE_KEY = 'delivery_hub_address_v1';

const AddressContext = createContext<AddressContextData>({} as AddressContextData);

export const AddressProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [address, setAddressState] = useState<DeliveryAddress>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Erro ao carregar endereço do localStorage', e);
    }
    return DEFAULT_PARAISOPOLIS_LOCATION;
  });

  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);

  const setAddress = (newAddr: DeliveryAddress) => {
    setAddressState(newAddr);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newAddr));
    } catch (e) {
      console.warn('Erro ao salvar endereço no localStorage', e);
    }
  };

  const openAddressModal = () => setIsAddressModalOpen(true);
  const closeAddressModal = () => setIsAddressModalOpen(false);

  const formatAddressSummary = (addr: DeliveryAddress): string => {
    if (!addr.street) return 'Definir endereço';
    const num = addr.number ? `, ${addr.number}` : '';
    const neigh = addr.neighborhood ? ` - ${addr.neighborhood}` : '';
    return `${addr.street}${num}${neigh}`;
  };

  return (
    <AddressContext.Provider
      value={{
        address,
        setAddress,
        isAddressModalOpen,
        openAddressModal,
        closeAddressModal,
        formatAddressSummary,
      }}
    >
      {children}
    </AddressContext.Provider>
  );
};

export const useAddress = () => {
  const context = useContext(AddressContext);
  if (!context) {
    throw new Error('useAddress deve ser utilizado dentro de um AddressProvider');
  }
  return context;
};
