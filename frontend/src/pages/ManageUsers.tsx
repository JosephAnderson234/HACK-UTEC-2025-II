import { useState, useEffect } from "react";
import { getAuthorities, createNewAuthority, type CreateAuthorityRequest } from "@/services/users";
import type { User } from "@/interfaces/api";
import { useNotification } from "@/hooks/useNotification";
import {
    UserPlus,
    Users,
    Mail,
    Phone,
    Building,
    Shield,
    Search,
    X,
    Eye,
    EyeOff,
    Loader2,
    CheckCircle,
    IdCard
} from "lucide-react";

const SECTORS = [
    "Seguridad",
    "Mantenimiento",
    "Limpieza",
    "IT",
    "Administrativo",
    "Académico"
];

const DEPARTMENTS = [
    "Seguridad",
    "Servicios Generales",
    "Tecnología",
    "Administración",
    "Académico"
];

export default function ManageUsers() {
    const { showNotification } = useNotification();

    const [authorities, setAuthorities] = useState<User[]>([]);
    const [filteredAuthorities, setFilteredAuthorities] = useState<User[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const [formData, setFormData] = useState<CreateAuthorityRequest>({
        first_name: "",
        last_name: "",
        email: "",
        password: "",
        DNI: "",
        cellphone: "",
        data_authority: {
            department: "",
            position: "",
            sector: "",
            charge: ""
        }
    });

    // Cargar autoridades
    useEffect(() => {
        loadAuthorities();
    }, []);

    // Filtrar autoridades por búsqueda
    useEffect(() => {
        const filtered = authorities.filter(auth => {
            const fullName = `${auth.first_name} ${auth.last_name}`.toLowerCase();
            const email = auth.email.toLowerCase();
            const sector = auth.data_authority?.sector?.toLowerCase() || "";
            const charge = auth.data_authority?.charge?.toLowerCase() || "";
            const search = searchTerm.toLowerCase();

            return fullName.includes(search) || 
                   email.includes(search) || 
                   sector.includes(search) || 
                   charge.includes(search);
        });
        setFilteredAuthorities(filtered);
    }, [searchTerm, authorities]);

    const loadAuthorities = async () => {
        try {
            setIsLoading(true);
            const data = await getAuthorities();
            setAuthorities(data.users);
            setFilteredAuthorities(data.users);
        } catch (error) {
            showNotification({
                type: "error",
                message: error instanceof Error ? error.message : "Error al cargar autoridades"
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleInputChange = (field: keyof CreateAuthorityRequest, value: string) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleAuthorityDataChange = (field: keyof CreateAuthorityRequest["data_authority"], value: string) => {
        setFormData(prev => ({
            ...prev,
            data_authority: {
                ...prev.data_authority,
                [field]: value
            }
        }));
    };

    const resetForm = () => {
        setFormData({
            first_name: "",
            last_name: "",
            email: "",
            password: "",
            DNI: "",
            cellphone: "",
            data_authority: {
                department: "",
                position: "",
                sector: "",
                charge: ""
            }
        });
        setShowPassword(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validaciones
        if (!formData.first_name || !formData.last_name || !formData.email || 
            !formData.password || !formData.DNI || !formData.cellphone) {
            showNotification({
                type: "error",
                message: "Por favor completa todos los campos personales"
            });
            return;
        }

        if (!formData.data_authority.department || !formData.data_authority.position || 
            !formData.data_authority.sector || !formData.data_authority.charge) {
            showNotification({
                type: "error",
                message: "Por favor completa todos los campos de autoridad"
            });
            return;
        }

        // Validar email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            showNotification({
                type: "error",
                message: "Por favor ingresa un email válido"
            });
            return;
        }

        // Validar DNI (8 dígitos)
        if (!/^\d{8}$/.test(formData.DNI)) {
            showNotification({
                type: "error",
                message: "El DNI debe tener 8 dígitos"
            });
            return;
        }

        // Validar celular (9 dígitos)
        if (!/^\d{9}$/.test(formData.cellphone)) {
            showNotification({
                type: "error",
                message: "El celular debe tener 9 dígitos"
            });
            return;
        }

        try {
            setIsCreating(true);
            const result = await createNewAuthority(formData);
            
            showNotification({
                type: "success",
                message: `Autoridad ${result.authority.first_name} ${result.authority.last_name} creada exitosamente`
            });

            resetForm();
            setShowForm(false);
            await loadAuthorities();
        } catch (error) {
            showNotification({
                type: "error",
                message: error instanceof Error ? error.message : "Error al crear autoridad"
            });
        } finally {
            setIsCreating(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
                    <p className="text-gray-600">Cargando autoridades...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                                <Shield className="h-8 w-8 text-blue-600 mr-3" />
                                Gestión de Autoridades
                            </h1>
                            <p className="mt-2 text-gray-600">
                                Administra las autoridades del sistema y crea nuevos usuarios
                            </p>
                        </div>
                        <button
                            onClick={() => setShowForm(!showForm)}
                            className={`flex items-center px-6 py-3 rounded-lg font-semibold transition-all shadow-md ${
                                showForm
                                    ? 'bg-gray-500 hover:bg-gray-600 text-white'
                                    : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white'
                            }`}
                        >
                            {showForm ? (
                                <>
                                    <X className="h-5 w-5 mr-2" />
                                    Cancelar
                                </>
                            ) : (
                                <>
                                    <UserPlus className="h-5 w-5 mr-2" />
                                    Nueva Autoridad
                                </>
                            )}
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Formulario de Creación */}
                    {showForm && (
                        <div className="lg:col-span-3">
                            <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-6">
                                <div className="bg-gradient-to-r from-green-600 to-teal-600 px-6 py-4">
                                    <h2 className="text-xl font-semibold text-white flex items-center">
                                        <UserPlus className="h-6 w-6 mr-2" />
                                        Crear Nueva Autoridad
                                    </h2>
                                </div>
                                <form onSubmit={handleSubmit} className="p-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {/* Información Personal */}
                                        <div className="lg:col-span-3">
                                            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                                <Users className="h-5 w-5 text-blue-600 mr-2" />
                                                Información Personal
                                            </h3>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Nombres *
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.first_name}
                                                onChange={(e) => handleInputChange("first_name", e.target.value)}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                placeholder="Juan"
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Apellidos *
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.last_name}
                                                onChange={(e) => handleInputChange("last_name", e.target.value)}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                placeholder="Pérez García"
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                                                <IdCard className="h-4 w-4 mr-1" />
                                                DNI *
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.DNI}
                                                onChange={(e) => handleInputChange("DNI", e.target.value)}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                placeholder="12345678"
                                                maxLength={8}
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                                                <Mail className="h-4 w-4 mr-1" />
                                                Email *
                                            </label>
                                            <input
                                                type="email"
                                                value={formData.email}
                                                onChange={(e) => handleInputChange("email", e.target.value)}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                placeholder="juan.perez@utec.edu.pe"
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                                                <Phone className="h-4 w-4 mr-1" />
                                                Celular *
                                            </label>
                                            <input
                                                type="tel"
                                                value={formData.cellphone}
                                                onChange={(e) => handleInputChange("cellphone", e.target.value)}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                placeholder="987654321"
                                                maxLength={9}
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Contraseña *
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type={showPassword ? "text" : "password"}
                                                    value={formData.password}
                                                    onChange={(e) => handleInputChange("password", e.target.value)}
                                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
                                                    placeholder="••••••••"
                                                    required
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                                >
                                                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Información de Autoridad */}
                                        <div className="lg:col-span-3 mt-4">
                                            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                                <Building className="h-5 w-5 text-blue-600 mr-2" />
                                                Información de Autoridad
                                            </h3>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Departamento *
                                            </label>
                                            <select
                                                value={formData.data_authority.department}
                                                onChange={(e) => handleAuthorityDataChange("department", e.target.value)}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                required
                                            >
                                                <option value="">Selecciona departamento</option>
                                                {DEPARTMENTS.map(dept => (
                                                    <option key={dept} value={dept}>{dept}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Sector *
                                            </label>
                                            <select
                                                value={formData.data_authority.sector}
                                                onChange={(e) => handleAuthorityDataChange("sector", e.target.value)}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                required
                                            >
                                                <option value="">Selecciona sector</option>
                                                {SECTORS.map(sector => (
                                                    <option key={sector} value={sector}>{sector}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Posición *
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.data_authority.position}
                                                onChange={(e) => handleAuthorityDataChange("position", e.target.value)}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                placeholder="Jefe de Seguridad"
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Cargo *
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.data_authority.charge}
                                                onChange={(e) => handleAuthorityDataChange("charge", e.target.value)}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                placeholder="Supervisor"
                                                required
                                            />
                                        </div>
                                    </div>

                                    {/* Botones */}
                                    <div className="mt-6 flex justify-end space-x-4">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                resetForm();
                                                setShowForm(false);
                                            }}
                                            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={isCreating}
                                            className={`px-6 py-2 rounded-lg font-semibold text-white transition-all flex items-center ${
                                                isCreating
                                                    ? 'bg-gray-300 cursor-not-allowed'
                                                    : 'bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 shadow-md'
                                            }`}
                                        >
                                            {isCreating ? (
                                                <>
                                                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                                                    Creando...
                                                </>
                                            ) : (
                                                <>
                                                    <CheckCircle className="h-5 w-5 mr-2" />
                                                    Crear Autoridad
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* Lista de Autoridades */}
                    <div className="lg:col-span-3">
                        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                            <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-xl font-semibold text-white flex items-center">
                                        <Users className="h-6 w-6 mr-2" />
                                        Autoridades Registradas ({filteredAuthorities.length})
                                    </h2>
                                </div>
                            </div>

                            {/* Búsqueda */}
                            <div className="p-6 border-b border-gray-200">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Buscar por nombre, email, sector o cargo..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>
                            </div>

                            {/* Lista */}
                            <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
                                {filteredAuthorities.length === 0 ? (
                                    <div className="p-12 text-center">
                                        <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                                        <p className="text-gray-600 font-medium">
                                            {searchTerm ? "No se encontraron autoridades" : "No hay autoridades registradas"}
                                        </p>
                                        <p className="text-sm text-gray-500 mt-2">
                                            {searchTerm ? "Intenta con otros términos de búsqueda" : "Crea tu primera autoridad usando el botón superior"}
                                        </p>
                                    </div>
                                ) : (
                                    filteredAuthorities.map((authority) => (
                                        <div key={authority.id} className="p-6 hover:bg-gray-50 transition-colors">
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center">
                                                        <h3 className="text-lg font-semibold text-gray-900">
                                                            {authority.first_name} {authority.last_name}
                                                        </h3>
                                                        <span className="ml-3 px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                                                            {authority.role.toUpperCase()}
                                                        </span>
                                                    </div>
                                                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                                                        <div className="flex items-center text-sm text-gray-600">
                                                            <Mail className="h-4 w-4 mr-2 text-gray-400" />
                                                            {authority.email}
                                                        </div>
                                                        {authority.cellphone && (
                                                            <div className="flex items-center text-sm text-gray-600">
                                                                <Phone className="h-4 w-4 mr-2 text-gray-400" />
                                                                {authority.cellphone}
                                                            </div>
                                                        )}
                                                        {authority.data_authority?.sector && (
                                                            <div className="flex items-center text-sm text-gray-600">
                                                                <Building className="h-4 w-4 mr-2 text-gray-400" />
                                                                <span className="font-medium mr-1">Sector:</span>
                                                                {authority.data_authority.sector}
                                                            </div>
                                                        )}
                                                        {authority.data_authority?.charge && (
                                                            <div className="flex items-center text-sm text-gray-600">
                                                                <Shield className="h-4 w-4 mr-2 text-gray-400" />
                                                                <span className="font-medium mr-1">Cargo:</span>
                                                                {authority.data_authority.charge}
                                                            </div>
                                                        )}
                                                    </div>
                                                    {authority.registration_date && (
                                                        <p className="mt-2 text-xs text-gray-500">
                                                            Registrado el {new Date(authority.registration_date).toLocaleDateString('es-PE', {
                                                                year: 'numeric',
                                                                month: 'long',
                                                                day: 'numeric'
                                                            })}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}