// src/components/Checkout/CheckoutWithNavigate.jsx
//
// Checkout.jsx jest klasą i korzysta z this.props.navigate — hooki (useNavigate)
// nie działają w klasach, więc tak samo jak przy CategoryNav/ProductCardWithNavigate,
// owijamy klasę małym komponentem funkcyjnym, który wstrzykuje navigate jako props.

import { useNavigate } from 'react-router-dom'
import Checkout from './Checkout.jsx'

export default function CheckoutWithNavigate(props) {
	const navigate = useNavigate()
	return <Checkout {...props} navigate={navigate} />
}
