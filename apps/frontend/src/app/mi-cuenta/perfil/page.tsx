'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { customerProfileApi } from '@/lib/api/customer-profile';
import { customerAddressesApi, type CustomerAddress } from '@/lib/api/customer-addresses';
import {
  customerPaymentMethodsApi,
  type CustomerPaymentMethod
} from '@/lib/api/customer-payment-methods';
import { getCustomerAccessToken } from '@/lib/auth/customer-storage';

type TabId = 'profile' | 'addresses' | 'payments' | 'preferences';

const genderOptions = [
  { value: '', label: 'Sin especificar' },
  { value: 'MALE', label: 'Masculino' },
  { value: 'FEMALE', label: 'Femenino' },
  { value: 'OTHER', label: 'Otro' },
  { value: 'PREFER_NOT_TO_SAY', label: 'Prefiero no decirlo' }
];

const idTypeOptions = [
  { value: '', label: 'Sin documento' },
  { value: 'V', label: 'V - Venezolano' },
  { value: 'E', label: 'E - Extranjero' },
  { value: 'J', label: 'J - Jurídico' },
  { value: 'P', label: 'P - Pasaporte' },
  { value: 'OTHER', label: 'Otro' }
];

export default function PerfilClientePage() {
  const [activeTab, setActiveTab] = useState<TabId>('profile');
  const [token, setToken] = useState<string | null>(() => getCustomerAccessToken());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [addressStreet, setAddressStreet] = useState('');
  const [addressLabel, setAddressLabel] = useState('');
  const [addressCity, setAddressCity] = useState('');
  const [addressState, setAddressState] = useState('');
  const [addressPostalCode, setAddressPostalCode] = useState('');
  const [addressIsDefault, setAddressIsDefault] = useState(false);

  const [paymentMethods, setPaymentMethods] = useState<CustomerPaymentMethod[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [paymentType, setPaymentType] = useState('');
  const [paymentNickname, setPaymentNickname] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentIsDefault, setPaymentIsDefault] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('');
  const [idType, setIdType] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [bio, setBio] = useState('');

  useEffect(() => {
    const currentToken = getCustomerAccessToken();
    setToken(currentToken);

    if (!currentToken) {
      return;
    }

    setLoading(true);
    setError(null);
    customerProfileApi
      .getMine()
      .then(response => {
        const data = response.data.data;
        setFirstName(data.firstName ?? '');
        setLastName(data.lastName ?? '');
        setDateOfBirth(data.dateOfBirth ? data.dateOfBirth.slice(0, 10) : '');
        setGender(data.gender ?? '');
        setIdType(data.idType ?? '');
        setIdNumber(data.idNumber ?? '');
        setBio(data.bio ?? '');
      })
      .catch(err => {
        if (err.response?.status === 401) {
          setError('Necesitas iniciar sesión de cliente para ver tu perfil.');
        } else {
          setError('No se pudo cargar tu perfil. Intenta nuevamente.');
        }
      })
      .finally(() => {
        setLoading(false);
      });

    setLoadingAddresses(true);
    customerAddressesApi
      .list()
      .then(response => {
        setAddresses(response.data.data);
      })
      .catch(() => {})
      .finally(() => {
        setLoadingAddresses(false);
      });

    setLoadingPayments(true);
    customerPaymentMethodsApi
      .list()
      .then(response => {
        setPaymentMethods(response.data.data);
      })
      .catch(() => {})
      .finally(() => {
        setLoadingPayments(false);
      });
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) return;
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const payload: Record<string, unknown> = {
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        gender: gender || null,
        idType: idType || null,
        idNumber: idNumber || null,
        bio: bio || null
      };

      if (dateOfBirth) {
        payload.dateOfBirth = dateOfBirth;
      }

      await customerProfileApi.updateMine(payload);
      setSuccess('Perfil actualizado correctamente.');
    } catch (err) {
      const anyErr = err as { response?: { status?: number } };
      if (anyErr.response?.status === 400) {
        setError('Algunos datos no son válidos. Revisa el formulario.');
        return;
      }
      setError('No se pudo actualizar tu perfil. Intenta nuevamente.');
    } finally {
      setSaving(false);
    }
  };

  const isLoggedIn = !!token;

  const renderTabs = () => (
    <div className="mb-4 flex gap-2 text-[11px]">
      <button
        type="button"
        onClick={() => setActiveTab('profile')}
        className={`flex-1 rounded-full px-3 py-2 font-medium ${
          activeTab === 'profile'
            ? 'bg-zinc-50 text-zinc-900'
            : 'bg-white/5 text-zinc-200 border border-white/10'
        }`}
      >
        Datos personales
      </button>
      <button
        type="button"
        onClick={() => setActiveTab('addresses')}
        className={`flex-1 rounded-full px-3 py-2 font-medium ${
          activeTab === 'addresses'
            ? 'bg-zinc-50 text-zinc-900'
            : 'bg-white/5 text-zinc-200 border border-white/10'
        }`}
      >
        Direcciones
      </button>
      <button
        type="button"
        onClick={() => setActiveTab('payments')}
        className={`flex-1 rounded-full px-3 py-2 font-medium ${
          activeTab === 'payments'
            ? 'bg-zinc-50 text-zinc-900'
            : 'bg-white/5 text-zinc-200 border border-white/10'
        }`}
      >
        Pagos
      </button>
      <button
        type="button"
        onClick={() => setActiveTab('preferences')}
        className={`flex-1 rounded-full px-3 py-2 font-medium ${
          activeTab === 'preferences'
            ? 'bg-zinc-50 text-zinc-900'
            : 'bg-white/5 text-zinc-200 border border-white/10'
        }`}
      >
        Preferencias
      </button>
    </div>
  );

  const renderProfileForm = () => (
    <form onSubmit={handleSubmit} className="space-y-3 text-[13px]">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-[11px] font-medium text-zinc-300">
            Nombre
          </label>
          <input
            type="text"
            value={firstName}
            onChange={event => setFirstName(event.target.value)}
            className="w-full rounded-xl border border-zinc-700 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
            placeholder="Tu nombre"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-medium text-zinc-300">
            Apellido
          </label>
          <input
            type="text"
            value={lastName}
            onChange={event => setLastName(event.target.value)}
            className="w-full rounded-xl border border-zinc-700 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
            placeholder="Tu apellido"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-[11px] font-medium text-zinc-300">
            Fecha de nacimiento
          </label>
          <input
            type="date"
            value={dateOfBirth}
            onChange={event => setDateOfBirth(event.target.value)}
            className="w-full rounded-xl border border-zinc-700 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-medium text-zinc-300">
            Género
          </label>
          <select
            value={gender}
            onChange={event => setGender(event.target.value)}
            className="w-full rounded-xl border border-zinc-700 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
          >
            {genderOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-[11px] font-medium text-zinc-300">
            Tipo de documento
          </label>
          <select
            value={idType}
            onChange={event => setIdType(event.target.value)}
            className="w-full rounded-xl border border-zinc-700 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
          >
            {idTypeOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-medium text-zinc-300">
            Número de documento
          </label>
          <input
            type="text"
            value={idNumber}
            onChange={event => setIdNumber(event.target.value)}
            className="w-full rounded-xl border border-zinc-700 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
            placeholder="V-12345678"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-[11px] font-medium text-zinc-300">
          Biografía
        </label>
        <textarea
          value={bio}
          onChange={event => setBio(event.target.value)}
          rows={3}
          className="w-full rounded-xl border border-zinc-700 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
          placeholder="Cuéntale al negocio algo sobre ti..."
        />
      </div>

      <button
        type="submit"
        disabled={saving}
        className="mt-1 w-full rounded-2xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-emerald-950 shadow-lg shadow-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {saving ? 'Guardando...' : 'Guardar cambios'}
      </button>
    </form>
  );

  const renderAddresses = () => {
    const handleCreateAddress = async (event: React.FormEvent) => {
      event.preventDefault();
      if (!token || !addressStreet.trim()) return;
      setError(null);
      setSuccess(null);

      try {
        const response = await customerAddressesApi.create({
          street: addressStreet.trim(),
          label: addressLabel.trim() || undefined,
          city: addressCity.trim() || undefined,
          state: addressState.trim() || undefined,
          postalCode: addressPostalCode.trim() || undefined,
          isDefault: addressIsDefault
        });
        const created = response.data.data;
        setAddresses(prev => {
          if (created.isDefault) {
            return [created, ...prev.map(item => ({ ...item, isDefault: false }))];
          }
          return [created, ...prev];
        });
        setAddressStreet('');
        setAddressLabel('');
        setAddressCity('');
        setAddressState('');
        setAddressPostalCode('');
        setAddressIsDefault(false);
        setSuccess('Dirección guardada correctamente.');
      } catch {
        setError('No se pudo guardar la dirección. Intenta nuevamente.');
      }
    };

    const handleSetDefault = async (id: string) => {
      if (!token) return;
      setError(null);
      setSuccess(null);
      try {
        const response = await customerAddressesApi.setDefault(id);
        const updated = response.data.data;
        setAddresses(prev =>
          prev.map(item => ({
            ...item,
            isDefault: item.id === updated.id
          }))
        );
        setSuccess('Dirección principal actualizada.');
      } catch {
        setError('No se pudo actualizar la dirección principal.');
      }
    };

    const handleDelete = async (id: string) => {
      if (!token) return;
      setError(null);
      setSuccess(null);
      try {
        await customerAddressesApi.remove(id);
        setAddresses(prev => prev.filter(item => item.id !== id));
        setSuccess('Dirección eliminada correctamente.');
      } catch {
        setError('No se pudo eliminar la dirección. Intenta nuevamente.');
      }
    };

    return (
      <div className="space-y-4 text-[13px]">
        <form onSubmit={handleCreateAddress} className="space-y-3 rounded-2xl border border-white/10 bg-black/30 px-4 py-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="mb-1 block text-[11px] font-medium text-zinc-300">
                Calle y número
              </label>
              <input
                type="text"
                value={addressStreet}
                onChange={event => setAddressStreet(event.target.value)}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                placeholder="Av. Principal, casa 12-34"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-zinc-300">
                Referencia
              </label>
              <input
                type="text"
                value={addressLabel}
                onChange={event => setAddressLabel(event.target.value)}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                placeholder="Casa, trabajo, etc."
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-zinc-300">
                Ciudad
              </label>
              <input
                type="text"
                value={addressCity}
                onChange={event => setAddressCity(event.target.value)}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                placeholder="Ej: Caracas"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-zinc-300">
                Estado
              </label>
              <input
                type="text"
                value={addressState}
                onChange={event => setAddressState(event.target.value)}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                placeholder="Ej: Miranda"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-zinc-300">
                Código postal
              </label>
              <input
                type="text"
                value={addressPostalCode}
                onChange={event => setAddressPostalCode(event.target.value)}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                placeholder="Ej: 1010"
              />
            </div>
            <div className="flex items-center gap-2 pt-5">
              <input
                id="address-default"
                type="checkbox"
                checked={addressIsDefault}
                onChange={event => setAddressIsDefault(event.target.checked)}
                className="h-4 w-4 rounded border-zinc-600 bg-zinc-900 text-amber-400 focus:ring-amber-400"
              />
              <label htmlFor="address-default" className="text-[11px] text-zinc-300">
                Usar como dirección principal
              </label>
            </div>
          </div>
          <button
            type="submit"
            className="mt-1 w-full rounded-2xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-emerald-950 shadow-lg shadow-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-70"
          >
            Guardar dirección
          </button>
        </form>

        <div className="space-y-2">
          {loadingAddresses ? (
            <div className="space-y-2">
              <div className="h-12 w-full animate-pulse rounded-2xl bg-white/5" />
              <div className="h-12 w-full animate-pulse rounded-2xl bg-white/5" />
            </div>
          ) : addresses.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 px-4 py-4 text-[12px] text-zinc-300">
              Aún no tienes direcciones guardadas. Agrega tu primera dirección arriba.
            </div>
          ) : (
            addresses.map(address => (
              <div
                key={address.id}
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-[13px]"
              >
                <div>
                  <div className="font-medium text-zinc-50">
                    {address.label || 'Dirección sin nombre'}
                    {address.isDefault && (
                      <span className="ml-2 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                        Principal
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-zinc-300">
                    {address.street}
                    {address.city ? `, ${address.city}` : ''}
                    {address.state ? `, ${address.state}` : ''}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {!address.isDefault && (
                    <button
                      type="button"
                      onClick={() => handleSetDefault(address.id)}
                      className="rounded-full bg-white/10 px-3 py-1 text-[11px] text-zinc-50"
                    >
                      Hacer principal
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDelete(address.id)}
                    className="text-[11px] text-red-300"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  const renderPayments = () => {
    const handleCreatePayment = async (event: React.FormEvent) => {
      event.preventDefault();
      if (!token || !paymentType) return;
      setError(null);
      setSuccess(null);

      const details: Record<string, unknown> = {};
      if (paymentReference.trim()) {
        details.reference = paymentReference.trim();
      }

      try {
        const response = await customerPaymentMethodsApi.create({
          type: paymentType,
          details,
          nickname: paymentNickname.trim() || undefined,
          isDefault: paymentIsDefault
        });
        const created = response.data.data;
        setPaymentMethods(prev => {
          if (created.isDefault) {
            return [created, ...prev.map(item => ({ ...item, isDefault: false }))];
          }
          return [created, ...prev];
        });
        setPaymentType('');
        setPaymentNickname('');
        setPaymentReference('');
        setPaymentIsDefault(false);
        setSuccess('Método de pago guardado correctamente.');
      } catch {
        setError('No se pudo guardar el método de pago. Intenta nuevamente.');
      }
    };

    const handleSetDefault = async (id: string) => {
      if (!token) return;
      setError(null);
      setSuccess(null);
      try {
        const response = await customerPaymentMethodsApi.setDefault(id);
        const updated = response.data.data;
        setPaymentMethods(prev =>
          prev.map(item => ({
            ...item,
            isDefault: item.id === updated.id
          }))
        );
        setSuccess('Método de pago principal actualizado.');
      } catch {
        setError('No se pudo actualizar el método de pago principal.');
      }
    };

    const handleDelete = async (id: string) => {
      if (!token) return;
      setError(null);
      setSuccess(null);
      try {
        await customerPaymentMethodsApi.remove(id);
        setPaymentMethods(prev => prev.filter(item => item.id !== id));
        setSuccess('Método de pago eliminado correctamente.');
      } catch {
        setError('No se pudo eliminar el método de pago. Intenta nuevamente.');
      }
    };

    const getPaymentLabel = (method: CustomerPaymentMethod) => {
      if (method.nickname) return method.nickname;
      if (method.type === 'ZELLE') return 'Zelle';
      if (method.type === 'PAGO_MOVIL') return 'Pago Móvil';
      if (method.type === 'BINANCE') return 'Binance';
      if (method.type === 'CASH_USD') return 'Efectivo USD';
      return method.type;
    };

    return (
      <div className="space-y-4 text-[13px]">
        <form onSubmit={handleCreatePayment} className="space-y-3 rounded-2xl border border-white/10 bg-black/30 px-4 py-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[11px] font-medium text-zinc-300">
                Tipo de método
              </label>
              <select
                value={paymentType}
                onChange={event => setPaymentType(event.target.value)}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
              >
                <option value="">Selecciona una opción</option>
                <option value="ZELLE">Zelle</option>
                <option value="PAGO_MOVIL">Pago móvil</option>
                <option value="BINANCE">Binance</option>
                <option value="CASH_USD">Efectivo USD</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-zinc-300">
                Nombre corto
              </label>
              <input
                type="text"
                value={paymentNickname}
                onChange={event => setPaymentNickname(event.target.value)}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                placeholder="Ej: Zelle personal"
              />
            </div>
            <div className="col-span-2">
              <label className="mb-1 block text-[11px] font-medium text-zinc-300">
                Referencia o nota
              </label>
              <input
                type="text"
                value={paymentReference}
                onChange={event => setPaymentReference(event.target.value)}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                placeholder="Correo Zelle, banco, red, etc."
              />
            </div>
            <div className="flex items-center gap-2 pt-1">
              <input
                id="payment-default"
                type="checkbox"
                checked={paymentIsDefault}
                onChange={event => setPaymentIsDefault(event.target.checked)}
                className="h-4 w-4 rounded border-zinc-600 bg-zinc-900 text-amber-400 focus:ring-amber-400"
              />
              <label htmlFor="payment-default" className="text-[11px] text-zinc-300">
                Usar como método principal
              </label>
            </div>
          </div>
          <button
            type="submit"
            className="mt-1 w-full rounded-2xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-emerald-950 shadow-lg shadow-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-70"
          >
            Guardar método de pago
          </button>
        </form>

        <div className="space-y-2">
          {loadingPayments ? (
            <div className="space-y-2">
              <div className="h-12 w-full animate-pulse rounded-2xl bg-white/5" />
              <div className="h-12 w-full animate-pulse rounded-2xl bg-white/5" />
            </div>
          ) : paymentMethods.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 px-4 py-4 text-[12px] text-zinc-300">
              Aún no tienes métodos de pago guardados. Agrega uno arriba.
            </div>
          ) : (
            paymentMethods.map(method => (
              <div
                key={method.id}
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-[13px]"
              >
                <div>
                  <div className="font-medium text-zinc-50">
                    {getPaymentLabel(method)}
                    {method.isDefault && (
                      <span className="ml-2 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                        Principal
                      </span>
                    )}
                    {!method.isActive && (
                      <span className="ml-2 rounded-full bg-zinc-600/40 px-2 py-0.5 text-[10px] font-semibold text-zinc-100">
                        Inactivo
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-zinc-300">
                    {method.type === 'ZELLE' && 'Pago por Zelle'}
                    {method.type === 'PAGO_MOVIL' && 'Pago móvil'}
                    {method.type === 'BINANCE' && 'Pago con Binance'}
                    {method.type === 'CASH_USD' && 'Pago en efectivo USD'}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {!method.isDefault && (
                    <button
                      type="button"
                      onClick={() => handleSetDefault(method.id)}
                      className="rounded-full bg-white/10 px-3 py-1 text-[11px] text-zinc-50"
                    >
                      Hacer principal
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDelete(method.id)}
                    className="text-[11px] text-red-300"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_rgba(245,200,66,0.08),_transparent_55%),_radial-gradient(ellipse_at_bottom,_rgba(79,142,247,0.07),_transparent_55%),_#050712] text-zinc-50">
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-4 py-6">
        <header className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-base font-semibold">Mi perfil</h1>
            <p className="mt-0.5 text-[11px] text-zinc-400">
              Ajusta tus datos personales para futuras compras.
            </p>
          </div>
          <Link
            href="/mi-cuenta"
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium text-zinc-50"
          >
            Mi cuenta
          </Link>
        </header>

        {!isLoggedIn ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-4 text-[13px]">
              <div className="mb-2 text-[12px] text-zinc-400">Sin sesión de cliente</div>
              <p className="text-zinc-200">
                Necesitas tener una sesión de cliente para gestionar tu perfil.
              </p>
              <p className="mt-1 text-[11px] text-zinc-400">
                Completa una compra con tu correo desde el catálogo y luego vuelve aquí para
                ver y editar tus datos.
              </p>
            </div>
            <Link
              href="/"
              className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-[13px] text-zinc-50"
            >
              <div>
                <div className="font-semibold">Ir al catálogo</div>
                <div className="text-[11px] text-zinc-200/80">
                  Explora productos y realiza tu primera compra.
                </div>
              </div>
              <span className="text-lg">🛒</span>
            </Link>
          </div>
        ) : (
          <div className="flex flex-1 flex-col">
            {renderTabs()}

            {loading ? (
              <div className="mt-4 space-y-3">
                <div className="h-10 w-3/4 animate-pulse rounded-xl bg-white/5" />
                <div className="h-10 w-full animate-pulse rounded-xl bg-white/5" />
                <div className="h-10 w-full animate-pulse rounded-xl bg-white/5" />
              </div>
            ) : (
              <div className="mt-2 flex-1 space-y-3">
                {error && (
                  <div className="rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-[12px] text-red-100">
                    {error}
                  </div>
                )}
                {success && (
                  <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-[12px] text-emerald-100">
                    {success}
                  </div>
                )}

                {activeTab === 'profile' && renderProfileForm()}
                {activeTab === 'addresses' && renderAddresses()}
                {activeTab === 'payments' && renderPayments()}
                {activeTab === 'preferences' && (
                  <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-4 text-[12px] text-zinc-300">
                    Muy pronto podrás ajustar tus preferencias de comunicación y notificaciones.
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
