import React, { Component } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabaseClient'

//? imports styles
import css from './Admin.module.css'

// ⚠️ Zweryfikuj w bazie: `select distinct type from products;`
// Wartości (value) poniżej muszą się dokładnie zgadzać z tym, co jest
// zapisane w kolumnie products.type — inaczej filtr i nowe produkty
// nie będą pasować do ?type=... w katalogu.
const TYPE_OPTIONS = [
	{ value: 'obuwie', label: 'Obuwie' },
	{ value: 'akcesoria', label: 'Akcesoria' },
	{ value: 'odziez', label: 'Odzież' }
]

const SEASON_OPTIONS = ['', 'Lato', 'Zima', 'Wiosna', 'Jesień', 'Wiosna-Jesień', 'Cały rok']

const EMPTY_FORM = {
	name: '',
	type: TYPE_OPTIONS[0].value,
	brand: '',
	model: '',
	price_pln: '',
	old_price_pln: '',
	stock_quantity: '0',
	unit: 'szt.',
	description: '',
	is_active: true,
	image_url: '',
	// Filtry z makiety (Płeć/Typ/Rodzaj/Kolor) — trzymane w formularzu jako proste
	// pole tekstowe z wartościami po przecinku (np. "Mężczyzna, Kobieta"), a przy
	// zapisie zamieniane na tablicę (patrz parseList/handleSubmit poniżej).
	// To dużo mniej kodu niż osobny picker-chipów dla każdego pola, a daje
	// dokładnie tę samą funkcjonalność.
	gender: '',
	season: '',
	product_type: '',
	kind: '',
	color: ''
}

// "Mężczyzna, Kobieta" -> ["Mężczyzna", "Kobieta"]; puste/białe znaki pomijane.
function parseList(str) {
	return (str || '')
		.split(',')
		.map(s => s.trim())
		.filter(Boolean)
}

// Usuwa polskie znaki diakrytyczne — ten sam pomysł co transliteracja
// w skrypcie Python do generowania PDF-a katalogu.
function slugify(text) {
	const map = { ą:'a', ć:'c', ę:'e', ł:'l', ń:'n', ó:'o', ś:'s', ź:'z', ż:'z' }
	return text
		.toLowerCase()
		.split('')
		.map(ch => map[ch] ?? ch)
		.join('')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/(^-|-$)/g, '')
}

// Mały funkcyjny wrapper, żeby class component mógł skorzystać z hooka
// useNavigate — ten sam wzorzec co przy innych komponentach w projekcie.
function withNavigate(WrappedComponent) {
	return function ComponentWithNavigate(props) {
		const navigate = useNavigate()
		return <WrappedComponent {...props} navigate={navigate} />
	}
}

class AdminBase extends Component {
	state = {
		activeTab: 'products', // 'products' | 'orders' | 'admins'
		view: 'list', // 'list' | 'form' (tylko w zakładce products)

		// --- Produkty ---
		products: [],
		loadingProducts: false,
		editingProduct: null,
		formData: EMPTY_FORM,
		imageFile: null,
		imagePreview: null,
		saving: false,
		saveError: null,
		search: '',
		filterType: 'all',
		filterStatus: 'all',

		// --- Zamówienia ---
		orders: [],
		loadingOrders: false,
		orderFilterStatus: 'all',
		orderActionLoadingId: null,
		orderActionError: null,
		trackingInputs: {}, // { [orderId]: string } — wpisywany numer przesyłki przed "Oznacz jako wysłane"

		// --- Administratorzy ---
		admins: [],
		loadingAdmins: false,
		adminEmailInput: '',
		adminActionLoading: false,
		adminActionError: null
	}
	productsFetched = false

	componentDidMount() {
		this.checkAccess()
	}

	componentDidUpdate(prevProps) {
		if (
			prevProps.authLoading !== this.props.authLoading ||
			prevProps.user !== this.props.user
		) {
			this.checkAccess()
		}
	}

	checkAccess = () => {
		const { authLoading, user, navigate } = this.props

		// Sesja jeszcze się ładuje — nie decydujemy przedwcześnie.
		if (authLoading) return

		if (!user || user.role !== 'admin') {
			navigate('/', { replace: true })
			return
		}

		if (!this.productsFetched) {
			this.productsFetched = true
			this.fetchProducts()
		}
	}

	switchTab = (tab) => {
		this.setState({ activeTab: tab })
		if (tab === 'admins') this.fetchAdmins()
		if (tab === 'orders') this.fetchOrders()
	}

	// =====================================================================
	// PRODUKTY
	// =====================================================================

	fetchProducts = async () => {
		this.setState({ loadingProducts: true })
		const { data, error } = await supabase
			.from('products')
			.select('*')
			.order('created_at', { ascending: false })

		if (error) console.error('Błąd pobierania produktów:', error)
		this.setState({ products: data || [], loadingProducts: false })
	}

	getFilteredProducts = () => {
		const { products, search, filterType, filterStatus } = this.state
		const query = search.trim().toLowerCase()

		return products.filter(product => {
			if (filterType !== 'all' && product.type !== filterType) return false
			if (filterStatus === 'active' && !product.is_active) return false
			if (filterStatus === 'inactive' && product.is_active) return false
			if (query) {
				const haystack = `${product.name || ''} ${product.sku || ''} ${product.brand || ''}`.toLowerCase()
				if (!haystack.includes(query)) return false
			}
			return true
		})
	}

	openCreateForm = () => {
		this.setState({
			view: 'form',
			editingProduct: null,
			formData: EMPTY_FORM,
			imageFile: null,
			imagePreview: null,
			saveError: null
		})
	}

	openEditForm = (product) => {
		this.setState({
			view: 'form',
			editingProduct: product,
			formData: {
				name: product.name || '',
				type: product.type || TYPE_OPTIONS[0].value,
				brand: product.brand || '',
				model: product.model || '',
				price_pln: product.price_pln ?? '',
				old_price_pln: product.old_price_pln ?? '',
				stock_quantity: product.stock_quantity ?? '0',
				unit: product.unit || 'szt.',
				description: product.description || '',
				is_active: product.is_active ?? true,
				image_url: product.image_url || '',
				gender: (product.gender || []).join(', '),
				season: product.season || '',
				product_type: (product.product_type || []).join(', '),
				kind: (product.kind || []).join(', '),
				color: (product.color || []).join(', ')
			},
			imageFile: null,
			imagePreview: product.image_url || null,
			saveError: null
		})
	}

	closeForm = () => {
		this.setState({ view: 'list', editingProduct: null, imageFile: null, imagePreview: null })
	}

	handleFieldChange = (field) => (e) => {
		const value = field === 'is_active' ? e.target.checked : e.target.value
		this.setState(prev => ({ formData: { ...prev.formData, [field]: value } }))
	}

	handleImageChange = (e) => {
		const file = e.target.files?.[0]
		if (!file) return
		this.setState({ imageFile: file, imagePreview: URL.createObjectURL(file) })
	}

	generateProductId = async (typeSlug) => {
		const { data, error } = await supabase
			.from('products')
			.select('id')
			.like('id', `${typeSlug}_%`)

		if (error || !data) return `${typeSlug}_${Date.now()}`

		const numbers = data
			.map(row => parseInt(String(row.id).split('_').pop(), 10))
			.filter(n => !Number.isNaN(n))

		const next = numbers.length ? Math.max(...numbers) + 1 : 1
		return `${typeSlug}_${next}`
	}

	uploadImage = async (file, productId) => {
		const ext = file.name.split('.').pop()
		const path = `${productId}/${Date.now()}.${ext}`

		const { error: uploadError } = await supabase.storage
			.from('product-images')
			.upload(path, file, { upsert: true })

		if (uploadError) throw uploadError

		const { data } = supabase.storage.from('product-images').getPublicUrl(path)
		return data.publicUrl
	}

	handleSubmit = async (e) => {
		e.preventDefault()
		this.setState({ saving: true, saveError: null })

		try {
			const { formData, editingProduct, imageFile } = this.state
			const isEditing = Boolean(editingProduct)
			const id = isEditing ? editingProduct.id : await this.generateProductId(formData.type)

			let imageUrl = formData.image_url
			if (imageFile) {
				imageUrl = await this.uploadImage(imageFile, id)
			}

			const payload = {
				id,
				sku: isEditing ? editingProduct.sku : id,
				name: formData.name,
				slug: slugify(formData.name),
				brand: formData.brand || null,
				type: formData.type,
				model: formData.model || null,
				description: formData.description || null,
				price_pln: parseFloat(formData.price_pln) || 0,
				old_price_pln: formData.old_price_pln === '' ? null : parseFloat(formData.old_price_pln) || null,
				stock_quantity: parseInt(formData.stock_quantity, 10) || 0,
				unit: formData.unit || 'szt.',
				image_url: imageUrl || null,
				is_active: formData.is_active,
				gender: parseList(formData.gender),
				season: formData.season || null,
				product_type: parseList(formData.product_type),
				kind: parseList(formData.kind),
				color: parseList(formData.color),
				updated_at: new Date().toISOString()
			}

			const { error } = await supabase.from('products').upsert(payload)
			if (error) throw error

			await this.fetchProducts()
			this.closeForm()
		} catch (err) {
			console.error('Błąd zapisu produktu:', err)
			this.setState({ saveError: err.message, saving: false })
			return
		}

		this.setState({ saving: false })
	}

	handleDelete = async (product) => {
		if (!window.confirm(`Usunąć produkt „${product.name}"? Tej operacji nie można cofnąć.`)) return

		const { error } = await supabase.from('products').delete().eq('id', product.id)

		if (error) {
			alert('Nie udało się usunąć produktu: ' + error.message)
			return
		}

		this.fetchProducts()
	}

	// =====================================================================
	// ZAMÓWIENIA
	// =====================================================================

	// order_items(*, products(name)) — dociąga nazwę produktu do każdej pozycji,
	// żeby nie pokazywać samego SKU w widoku admina.
	fetchOrders = async () => {
		this.setState({ loadingOrders: true })
		const { data, error } = await supabase
			.from('orders')
			.select('*, order_items(*, products(name))')
			.order('created_at', { ascending: false })

		if (error) console.error('Błąd pobierania zamówień:', error)
		this.setState({ orders: data || [], loadingOrders: false })
	}

	getFilteredOrders = () => {
		const { orders, orderFilterStatus } = this.state
		if (orderFilterStatus === 'all') return orders
		return orders.filter(o => o.status === orderFilterStatus)
	}

	setTrackingInput = (orderId, value) => {
		this.setState(prev => ({
			trackingInputs: { ...prev.trackingInputs, [orderId]: value }
		}))
	}

	// Jedna metoda dla wszystkich przejść statusu — woła Edge Function, bo tylko
	// tam (service_role) można bezpiecznie odczytać e-mail klienta z auth.users
	// i wysłać mu powiadomienie. Zwykły supabase.from('orders').update(...) by
	// zmienił status, ale nie miałby jak wysłać maila.
	changeOrderStatus = async (order, newStatus) => {
		const trackingNumber = newStatus === 'shipped'
			? (this.state.trackingInputs[order.id] || '').trim()
			: undefined

		if (newStatus === 'shipped' && !trackingNumber) {
			if (!window.confirm('Nie podano numeru przesyłki. Oznaczyć jako wysłane mimo to?')) return
		}

		this.setState({ orderActionLoadingId: order.id, orderActionError: null })

		try {
			const { data: { session } } = await supabase.auth.getSession()
			const { data, error } = await supabase.functions.invoke('update-order-status', {
				body: { orderId: order.id, newStatus, trackingNumber },
				headers: { Authorization: `Bearer ${session.access_token}` }
			})

			if (error || data?.error) {
				throw new Error(data?.error || error?.message || 'Nieznany błąd.')
			}

			await this.fetchOrders()
		} catch (err) {
			console.error('Błąd zmiany statusu zamówienia:', err)
			this.setState({ orderActionError: err.message })
		} finally {
			this.setState({ orderActionLoadingId: null })
		}
	}

	// =====================================================================
	// ADMINISTRATORZY
	// =====================================================================

	fetchAdmins = async () => {
		this.setState({ loadingAdmins: true })
		const { data, error } = await supabase.rpc('list_admins')
		if (error) console.error('Błąd pobierania listy adminów:', error)
		this.setState({ admins: data || [], loadingAdmins: false })
	}

	handlePromote = async (e) => {
		e.preventDefault()
		const email = this.state.adminEmailInput.trim()
		if (!email) return

		this.setState({ adminActionLoading: true, adminActionError: null })
		const { error } = await supabase.rpc('promote_to_admin', { target_email: email })

		if (error) {
			this.setState({ adminActionError: error.message, adminActionLoading: false })
			return
		}

		this.setState({ adminEmailInput: '', adminActionLoading: false })
		this.fetchAdmins()
	}

	handleRevoke = async (admin) => {
		if (admin.id === this.props.user.id) return // dodatkowa asekuracja po stronie UI
		if (!window.confirm(`Odebrać dostęp administratora użytkownikowi ${admin.email}?`)) return

		this.setState({ adminActionLoading: true, adminActionError: null })
		const { error } = await supabase.rpc('revoke_admin', { target_email: admin.email })

		if (error) {
			this.setState({ adminActionError: error.message, adminActionLoading: false })
			return
		}

		this.setState({ adminActionLoading: false })
		this.fetchAdmins()
	}

	// =====================================================================
	// RENDER — produkty
	// =====================================================================

	renderList() {
		const { loadingProducts, search, filterType, filterStatus } = this.state
		const filtered = this.getFilteredProducts()

		return (
			<>
				<div className={css.toolbar}>
					<h1 className={css.admin__title}>Produkty</h1>
					<button type='button' className={css.btnPrimary} onClick={this.openCreateForm}>
						+ Dodaj produkt
					</button>
				</div>

				<div className={css.filterBar}>
					<input
						type='text'
						placeholder='Szukaj po nazwie, SKU lub marce…'
						className={css.searchInput}
						value={search}
						onChange={(e) => this.setState({ search: e.target.value })}
					/>
					<select
						value={filterType}
						onChange={(e) => this.setState({ filterType: e.target.value })}
					>
						<option value='all'>Wszystkie klasy</option>
						{TYPE_OPTIONS.map(opt => (
							<option key={opt.value} value={opt.value}>{opt.label}</option>
						))}
					</select>
					<select
						value={filterStatus}
						onChange={(e) => this.setState({ filterStatus: e.target.value })}
					>
						<option value='all'>Wszystkie statusy</option>
						<option value='active'>Tylko aktywne</option>
						<option value='inactive'>Tylko ukryte</option>
					</select>
					<span className={css.resultsCount}>{filtered.length} z {this.state.products.length}</span>
				</div>

				{loadingProducts ? (
					<p className={css.muted}>Ładowanie…</p>
				) : (
					<div className={css.tableWrap}>
						<table className={css.table}>
							<thead>
								<tr>
									<th></th>
									<th>Nazwa</th>
									<th>Klasa</th>
									<th>Cena</th>
									<th>Stan</th>
									<th>Status</th>
									<th></th>
								</tr>
							</thead>
							<tbody>
								{filtered.map(product => (
									<tr key={product.id}>
										<td>
											{product.image_url ? (
												<img src={product.image_url} alt={product.name} className={css.thumb} />
											) : (
												<div className={css.thumbPlaceholder} />
											)}
										</td>
										<td>{product.name}</td>
										<td>
											<span className={css.badge}>
												{TYPE_OPTIONS.find(t => t.value === product.type)?.label || product.type}
											</span>
										</td>
										<td>{product.price_pln} zł</td>
										<td>{product.stock_quantity}</td>
										<td>
											<span className={product.is_active ? css.statusActive : css.statusInactive}>
												{product.is_active ? 'Aktywny' : 'Ukryty'}
											</span>
										</td>
										<td className={css.actionsCell}>
											<button type='button' className={css.btnGhost} onClick={() => this.openEditForm(product)}>
												Edytuj
											</button>
											<button type='button' className={css.btnDanger} onClick={() => this.handleDelete(product)}>
												Usuń
											</button>
										</td>
									</tr>
								))}
								{filtered.length === 0 && (
									<tr>
										<td colSpan={7} className={css.muted}>Brak produktów spełniających kryteria.</td>
									</tr>
								)}
							</tbody>
						</table>
					</div>
				)}
			</>
		)
	}

	renderForm() {
		const { formData, editingProduct, imagePreview, saving, saveError } = this.state

		return (
			<>
				<div className={css.toolbar}>
					<h1 className={css.admin__title}>
						{editingProduct ? `Edytuj: ${editingProduct.name}` : 'Nowy produkt'}
					</h1>
					<button type='button' className={css.btnGhost} onClick={this.closeForm}>
						← Wróć do listy
					</button>
				</div>

				<form className={css.form} onSubmit={this.handleSubmit}>
					<div className={css.formGrid}>
						<label className={css.field}>
							<span>Nazwa produktu *</span>
							<input type='text' required value={formData.name} onChange={this.handleFieldChange('name')} />
						</label>

						<label className={css.field}>
							<span>Klasa *</span>
							<select value={formData.type} onChange={this.handleFieldChange('type')}>
								{TYPE_OPTIONS.map(opt => (
									<option key={opt.value} value={opt.value}>{opt.label}</option>
								))}
							</select>
						</label>

						<label className={css.field}>
							<span>Marka</span>
							<input type='text' value={formData.brand} onChange={this.handleFieldChange('brand')} />
						</label>

						<label className={css.field}>
							<span>Model</span>
							<input type='text' value={formData.model} onChange={this.handleFieldChange('model')} />
						</label>

						<label className={css.field}>
							<span>Cena (PLN) *</span>
							<input type='number' step='0.01' min='0' required value={formData.price_pln} onChange={this.handleFieldChange('price_pln')} />
						</label>

						<label className={css.field}>
							<span>Cena przed promocją (PLN)</span>
							<input
								type='number' step='0.01' min='0'
								placeholder='puste = brak promocji'
								value={formData.old_price_pln}
								onChange={this.handleFieldChange('old_price_pln')}
							/>
						</label>

						<label className={css.field}>
							<span>Ilość na stanie</span>
							<input type='number' min='0' value={formData.stock_quantity} onChange={this.handleFieldChange('stock_quantity')} />
						</label>

						<label className={css.field}>
							<span>Płeć</span>
							<input
								type='text'
								placeholder='np. Mężczyzna, Kobieta'
								value={formData.gender}
								onChange={this.handleFieldChange('gender')}
							/>
						</label>

						<label className={css.field}>
							<span>Sezon</span>
							<select value={formData.season} onChange={this.handleFieldChange('season')}>
								{SEASON_OPTIONS.map(opt => (
									<option key={opt} value={opt}>{opt || '— nie wybrano —'}</option>
								))}
							</select>
						</label>

						<label className={css.field}>
							<span>Typ (głównie Obuwie)</span>
							<input
								type='text'
								placeholder='np. Bieganie, Trening'
								value={formData.product_type}
								onChange={this.handleFieldChange('product_type')}
							/>
						</label>

						<label className={css.field}>
							<span>Rodzaj (głównie Odzież/Akcesoria)</span>
							<input
								type='text'
								placeholder='np. Bluza, Czapka'
								value={formData.kind}
								onChange={this.handleFieldChange('kind')}
							/>
						</label>

						<label className={css.field}>
							<span>Kolor</span>
							<input
								type='text'
								placeholder='np. Czarny, Biały'
								value={formData.color}
								onChange={this.handleFieldChange('color')}
							/>
						</label>

						<label className={css.fieldCheckbox}>
							<input type='checkbox' checked={formData.is_active} onChange={this.handleFieldChange('is_active')} />
							<span>Produkt aktywny (widoczny w sklepie)</span>
						</label>
					</div>
					<p className={css.formHint}>Płeć / Typ / Rodzaj / Kolor: kilka wartości oddzielaj przecinkiem — to właśnie te pola widać potem jako chipy w filtrach katalogu.</p>

					<label className={css.field}>
						<span>Opis</span>
						<textarea rows={5} value={formData.description} onChange={this.handleFieldChange('description')} />
					</label>

					<label className={css.field}>
						<span>Zdjęcie</span>
						<input type='file' accept='image/*' onChange={this.handleImageChange} />
					</label>

					{imagePreview && <img src={imagePreview} alt='Podgląd' className={css.imagePreview} />}

					{saveError && <p className={css.errorText}>Błąd: {saveError}</p>}

					<div className={css.formActions}>
						<button type='button' className={css.btnGhost} onClick={this.closeForm}>Anuluj</button>
						<button type='submit' className={css.btnPrimary} disabled={saving}>
							{saving ? 'Zapisywanie…' : 'Zapisz produkt'}
						</button>
					</div>
				</form>
			</>
		)
	}

	// =====================================================================
	// RENDER — zamówienia
	// =====================================================================

	renderOrders() {
		const {
			loadingOrders, orderFilterStatus, orderActionLoadingId,
			orderActionError, trackingInputs
		} = this.state
		const filtered = this.getFilteredOrders()

		const STATUS_LABELS = {
			pending: 'Oczekujące',
			paid: 'Opłacone',
			processing: 'Przyjęte do realizacji',
			shipped: 'Wysłane',
			completed: 'Zrealizowane',
			cancelled: 'Anulowane'
		}

		return (
			<>
				<div className={css.toolbar}>
					<h1 className={css.admin__title}>Zamówienia</h1>
				</div>

				<div className={css.filterBar}>
					<select
						value={orderFilterStatus}
						onChange={(e) => this.setState({ orderFilterStatus: e.target.value })}
					>
						<option value='all'>Wszystkie statusy</option>
						{Object.entries(STATUS_LABELS).map(([value, label]) => (
							<option key={value} value={value}>{label}</option>
						))}
					</select>
					<span className={css.resultsCount}>{filtered.length} z {this.state.orders.length}</span>
				</div>

				{orderActionError && <p className={css.errorText}>Błąd: {orderActionError}</p>}

				{loadingOrders ? (
					<p className={css.muted}>Ładowanie…</p>
				) : (
					<div className={css.tableWrap}>
						<table className={css.table}>
							<thead>
								<tr>
									<th>Zamówienie</th>
									<th>Produkty</th>
									<th>Kwota</th>
									<th>Dostawa</th>
									<th>Status</th>
									<th></th>
								</tr>
							</thead>
							<tbody>
								{filtered.map(order => {
									const items = order.order_items || []
									const isLoading = orderActionLoadingId === order.id
									const canProcess = order.status === 'paid'
									const canShip = order.status === 'processing' || order.status === 'paid'
									const canCancel = order.status === 'paid' || order.status === 'processing'

									return (
										<tr key={order.id}>
											<td>
												<div style={{ fontWeight: 700 }}>#{order.id}</div>
												<div className={css.muted} style={{ fontSize: 12 }}>
													{new Date(order.created_at).toLocaleDateString('pl-PL')}
												</div>
											</td>
											<td style={{ fontSize: 13 }}>
												{items.map(item => (
													<div key={item.id}>
														{item.products?.name || item.product_id} × {item.quantity}
														{item.size ? ` (rozm. ${item.size})` : ''}
													</div>
												))}
											</td>
											<td>{Number(order.total).toFixed(2)} zł</td>
											<td style={{ fontSize: 13 }}>
												{order.shipping_method || '—'}
												{order.tracking_number && (
													<div className={css.muted}>nr: {order.tracking_number}</div>
												)}
											</td>
											<td>
												<span className={css.badge}>
													{STATUS_LABELS[order.status] || order.status}
												</span>
											</td>
											<td className={css.actionsCell} style={{ flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
												{canProcess && (
													<button
														type='button'
														className={css.btnGhost}
														disabled={isLoading}
														onClick={() => this.changeOrderStatus(order, 'processing')}
													>
														Przyjmij zamówienie
													</button>
												)}
												{canShip && (
													<div style={{ display: 'flex', gap: 6 }}>
														<input
															type='text'
															placeholder='Numer przesyłki'
															value={trackingInputs[order.id] || ''}
															onChange={(e) => this.setTrackingInput(order.id, e.target.value)}
															style={{
																background: 'rgba(0,0,0,0.3)',
																border: '1px solid rgba(255,255,255,0.14)',
																borderRadius: 8,
																padding: '6px 10px',
																color: '#fff',
																fontSize: 12,
																width: 130
															}}
														/>
														<button
															type='button'
															className={css.btnPrimary}
															disabled={isLoading}
															onClick={() => this.changeOrderStatus(order, 'shipped')}
														>
															Wysłano
														</button>
													</div>
												)}
												{canCancel && (
													<button
														type='button'
														className={css.btnDanger}
														disabled={isLoading}
														onClick={() => this.changeOrderStatus(order, 'cancelled')}
													>
														Anuluj
													</button>
												)}
											</td>
										</tr>
									)
								})}
								{filtered.length === 0 && (
									<tr>
										<td colSpan={6} className={css.muted}>Brak zamówień spełniających kryteria.</td>
									</tr>
								)}
							</tbody>
						</table>
					</div>
				)}
			</>
		)
	}

	// =====================================================================
	// RENDER — administratorzy
	// =====================================================================

	renderAdmins() {
		const { admins, loadingAdmins, adminEmailInput, adminActionLoading, adminActionError } = this.state
		const currentUserId = this.props.user.id

		return (
			<>
				<div className={css.toolbar}>
					<h1 className={css.admin__title}>Administratorzy</h1>
				</div>

				<form className={css.inlineForm} onSubmit={this.handlePromote}>
					<input
						type='email'
						required
						placeholder='email@przyklad.com'
						value={adminEmailInput}
						onChange={(e) => this.setState({ adminEmailInput: e.target.value })}
					/>
					<button type='submit' className={css.btnPrimary} disabled={adminActionLoading}>
						{adminActionLoading ? 'Zapisywanie…' : 'Nadaj dostęp admina'}
					</button>
				</form>
				<p className={css.hint}>
					Osoba musi mieć już konto w sklepie (przynajmniej raz się zalogować), zanim nadasz jej dostęp.
				</p>

				{adminActionError && <p className={css.errorText}>Błąd: {adminActionError}</p>}

				{loadingAdmins ? (
					<p className={css.muted}>Ładowanie…</p>
				) : (
					<div className={css.tableWrap}>
						<table className={css.table}>
							<thead>
								<tr>
									<th>E-mail</th>
									<th></th>
								</tr>
							</thead>
							<tbody>
								{admins.map(admin => (
									<tr key={admin.id}>
										<td>
											{admin.email}
											{admin.id === currentUserId && <span className={css.youBadge}> (Ty)</span>}
										</td>
										<td className={css.actionsCell}>
											<button
												type='button'
												className={css.btnDanger}
												disabled={admin.id === currentUserId || adminActionLoading}
												onClick={() => this.handleRevoke(admin)}
											>
												Odbierz dostęp
											</button>
										</td>
									</tr>
								))}
								{admins.length === 0 && (
									<tr><td colSpan={2} className={css.muted}>Brak adminów.</td></tr>
								)}
							</tbody>
						</table>
					</div>
				)}
			</>
		)
	}

	render() {
		const { authLoading, user } = this.props

		if (authLoading || !user || user.role !== 'admin') {
			return null
		}

		const { activeTab, view } = this.state

		return (
			<div className={css.admin}>
				<div className={css.tabs}>
					<button
						type='button'
						className={`${css.tab} ${activeTab === 'products' ? css.tabActive : ''}`}
						onClick={() => this.switchTab('products')}
					>
						Produkty
					</button>
					<button
						type='button'
						className={`${css.tab} ${activeTab === 'orders' ? css.tabActive : ''}`}
						onClick={() => this.switchTab('orders')}
					>
						Zamówienia
					</button>
					<button
						type='button'
						className={`${css.tab} ${activeTab === 'admins' ? css.tabActive : ''}`}
						onClick={() => this.switchTab('admins')}
					>
						Administratorzy
					</button>
				</div>

				{activeTab === 'products' && (view === 'list' ? this.renderList() : this.renderForm())}
				{activeTab === 'orders' && this.renderOrders()}
				{activeTab === 'admins' && this.renderAdmins()}
			</div>
		)
	}
}

export const Admin = withNavigate(AdminBase)
export default Admin