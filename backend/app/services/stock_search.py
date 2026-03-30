"""Stock search service — search NSE stocks by name or ticker."""

# Comprehensive NSE stock directory (500+ stocks covering Nifty 500)
# Format: (ticker_suffix, company_name)
_NSE_STOCKS = [
    # Nifty 50
    ("RELIANCE", "Reliance Industries"), ("TCS", "Tata Consultancy Services"), ("HDFCBANK", "HDFC Bank"),
    ("INFY", "Infosys"), ("ICICIBANK", "ICICI Bank"), ("HINDUNILVR", "Hindustan Unilever"),
    ("ITC", "ITC Ltd"), ("SBIN", "State Bank of India"), ("BHARTIARTL", "Bharti Airtel"),
    ("KOTAKBANK", "Kotak Mahindra Bank"), ("LT", "Larsen & Toubro"), ("AXISBANK", "Axis Bank"),
    ("ASIANPAINT", "Asian Paints"), ("MARUTI", "Maruti Suzuki"), ("TITAN", "Titan Company"),
    ("SUNPHARMA", "Sun Pharmaceutical"), ("ULTRACEMCO", "UltraTech Cement"), ("WIPRO", "Wipro"),
    ("HCLTECH", "HCL Technologies"), ("BAJFINANCE", "Bajaj Finance"), ("BAJFINSV", "Bajaj Finserv"),
    ("TATAMOTORS", "Tata Motors"), ("NTPC", "NTPC Ltd"), ("POWERGRID", "Power Grid Corp"),
    ("ONGC", "Oil & Natural Gas Corp"), ("ADANIENT", "Adani Enterprises"), ("ADANIPORTS", "Adani Ports"),
    ("TATASTEEL", "Tata Steel"), ("JSWSTEEL", "JSW Steel"), ("COALINDIA", "Coal India"),
    ("TECHM", "Tech Mahindra"), ("INDUSINDBK", "IndusInd Bank"), ("DRREDDY", "Dr Reddys Labs"),
    ("CIPLA", "Cipla"), ("DIVISLAB", "Divis Laboratories"), ("NESTLEIND", "Nestle India"),
    ("BRITANNIA", "Britannia Industries"), ("HEROMOTOCO", "Hero MotoCorp"), ("EICHERMOT", "Eicher Motors"),
    ("M&M", "Mahindra & Mahindra"), ("BAJAJ-AUTO", "Bajaj Auto"), ("HDFCLIFE", "HDFC Life Insurance"),
    ("SBILIFE", "SBI Life Insurance"), ("GRASIM", "Grasim Industries"), ("APOLLOHOSP", "Apollo Hospitals"),
    ("BPCL", "Bharat Petroleum"), ("TATACONSUM", "Tata Consumer Products"), ("HINDALCO", "Hindalco Industries"),
    ("SHRIRAMFIN", "Shriram Finance"),
    # Nifty Next 50
    ("ADANIGREEN", "Adani Green Energy"), ("ADANIPOWER", "Adani Power"), ("AMBUJACEM", "Ambuja Cements"),
    ("BANKBARODA", "Bank of Baroda"), ("BEL", "Bharat Electronics"), ("BOSCHLTD", "Bosch"),
    ("CANBK", "Canara Bank"), ("CHOLAFIN", "Cholamandalam Finance"), ("COLPAL", "Colgate Palmolive"),
    ("DLF", "DLF Ltd"), ("GAIL", "GAIL India"), ("GODREJCP", "Godrej Consumer Products"),
    ("HAL", "Hindustan Aeronautics"), ("HAVELLS", "Havells India"), ("ICICIGI", "ICICI Lombard GI"),
    ("ICICIPRULI", "ICICI Prudential Life"), ("INDIGO", "IndiGo Airlines"), ("IOC", "Indian Oil Corp"),
    ("IRFC", "Indian Railway Finance"), ("JINDALSTEL", "Jindal Steel"), ("JIOFIN", "Jio Financial Services"),
    ("LICI", "LIC of India"), ("LUPIN", "Lupin"), ("MARICO", "Marico"),
    ("MOTHERSON", "Samvardhana Motherson"), ("NAUKRI", "Info Edge (Naukri)"), ("PFC", "Power Finance Corp"),
    ("PIDILITIND", "Pidilite Industries"), ("PNB", "Punjab National Bank"), ("RECLTD", "REC Ltd"),
    ("SIEMENS", "Siemens India"), ("SRF", "SRF Ltd"), ("TATAPOWER", "Tata Power"),
    ("TORNTPHARM", "Torrent Pharma"), ("TVSMOTOR", "TVS Motor"), ("VEDL", "Vedanta"),
    ("ZOMATO", "Zomato"), ("ZYDUSLIFE", "Zydus Lifesciences"),
    # Popular Mid-caps
    ("PERSISTENT", "Persistent Systems"), ("COFORGE", "Coforge"), ("MPHASIS", "Mphasis"),
    ("TRENT", "Trent Ltd (Westside/Zudio)"), ("POLYCAB", "Polycab India"), ("PIIND", "PI Industries"),
    ("ASTRAL", "Astral Ltd"), ("KPITTECH", "KPIT Technologies"), ("LTTS", "L&T Technology Services"),
    ("MUTHOOTFIN", "Muthoot Finance"), ("PAGEIND", "Page Industries (Jockey)"),
    ("FEDERALBNK", "Federal Bank"), ("IDFCFIRSTB", "IDFC First Bank"), ("VOLTAS", "Voltas"),
    ("CROMPTON", "Crompton Greaves"), ("PAYTM", "Paytm (One97 Communications)"),
    ("NYKAA", "Nykaa (FSN E-Commerce)"), ("DMART", "Avenue Supermarts (DMart)"), ("IRCTC", "IRCTC"),
    ("TATAELXSI", "Tata Elxsi"), ("MFSL", "Max Financial Services"), ("OBEROIRLTY", "Oberoi Realty"),
    ("POLICYBZR", "PB Fintech (PolicyBazaar)"), ("STARHEALTH", "Star Health Insurance"),
    ("SBICARD", "SBI Cards"), ("CUMMINSIND", "Cummins India"), ("ESCORTS", "Escorts Kubota"),
    ("AFFLE", "Affle India"), ("DEEPAKNTR", "Deepak Nitrite"), ("BALKRISIND", "Balkrishna Industries"),
    ("CONCOR", "Container Corp"), ("MAXHEALTH", "Max Healthcare"), ("JUBLFOOD", "Jubilant FoodWorks"),
    ("AUBANK", "AU Small Finance Bank"), ("LICHSGFIN", "LIC Housing Finance"),
    ("BANDHANBNK", "Bandhan Bank"), ("INDIANB", "Indian Bank"), ("BIOCON", "Biocon"),
    ("ABCAPITAL", "Aditya Birla Capital"), ("AUROPHARMA", "Aurobindo Pharma"),
    ("LAURUSLABS", "Laurus Labs"), ("ALKEM", "Alkem Laboratories"), ("IPCALAB", "IPCA Laboratories"),
    ("NATCOPHARMA", "Natco Pharma"), ("ABBOTINDIA", "Abbott India"),
    # Popular Small-caps
    ("ROUTE", "Route Mobile"), ("CAMPUS", "Campus Activewear"), ("HAPPSTMNDS", "Happiest Minds"),
    ("MASTEK", "Mastek"), ("NEWGEN", "Newgen Software"), ("DATAPATTNS", "Data Patterns"),
    ("KAYNES", "Kaynes Technology"), ("CLEAN", "Clean Science"), ("LATENTVIEW", "Latent View Analytics"),
    ("ZENTEC", "Zen Technologies"), ("OLECTRA", "Olectra Greentech"), ("RATNAMANI", "Ratnamani Metals"),
    ("FINEORG", "Fine Organic Industries"), ("SAFARI", "Safari Industries"), ("CDSL", "CDSL"),
    # AMC & Financial
    ("NAM-INDIA", "Nippon Life India AMC"), ("HDFCAMC", "HDFC AMC"), ("UTIAMC", "UTI AMC"),
    ("IIFL", "IIFL Finance"), ("MANAPPURAM", "Manappuram Finance"), ("POONAWALLA", "Poonawalla Fincorp"),
    ("BAJAJFINSV", "Bajaj Finserv"), ("ANGELONE", "Angel One"),
    # Insurance
    ("NIACL", "New India Assurance"), ("GICRE", "GIC Re"), ("STARHEALT", "Star Health"),
    # IT / Tech
    ("LTIM", "LTIMindtree"), ("MPHASIS", "Mphasis"), ("CYIENT", "Cyient"),
    ("BIRLASOFT", "Birlasoft"), ("ZENSAR", "Zensar Technologies"), ("TANLA", "Tanla Platforms"),
    ("SONATSOFTW", "Sonata Software"), ("INTELLECT", "Intellect Design"),
    # Auto
    ("ASHOKLEY", "Ashok Leyland"), ("TATAMTRDVR", "Tata Motors DVR"), ("MOTHERSON", "Motherson Sumi"),
    ("EXIDEIND", "Exide Industries"), ("AMARAJABAT", "Amara Raja Energy"),
    ("ENDURANCE", "Endurance Technologies"), ("SUNDRMFAST", "Sundram Fasteners"),
    # Infra / Real Estate
    ("GODREJPROP", "Godrej Properties"), ("PRESTIGE", "Prestige Estates"), ("BRIGADE", "Brigade Enterprises"),
    ("SOBHA", "Sobha Ltd"), ("PHOENIXLTD", "Phoenix Mills"), ("IRCON", "Ircon International"),
    ("NBCC", "NBCC India"), ("KEC", "KEC International"), ("CESC", "CESC Ltd"),
    # FMCG / Consumer
    ("DABUR", "Dabur India"), ("EMAMILTD", "Emami"), ("TATACONSUM", "Tata Consumer"),
    ("VBL", "Varun Beverages"), ("RADICO", "Radico Khaitan"), ("UBL", "United Breweries"),
    ("UNITDSPR", "United Spirits"), ("PGHH", "Procter & Gamble Hygiene"),
    # Metals / Mining
    ("NMDC", "NMDC"), ("NATIONALUM", "National Aluminium"), ("SAIL", "Steel Authority India"),
    ("WELCORP", "Welspun Corp"), ("APLAPOLLO", "APL Apollo Tubes"),
    # Energy
    ("ADANIGREEN", "Adani Green"), ("NHPC", "NHPC"), ("SJVN", "SJVN"),
    ("TATAPOWER", "Tata Power"), ("TORNTPOWER", "Torrent Power"), ("JSW ENERGY", "JSW Energy"),
    ("PETRONET", "Petronet LNG"), ("IGL", "Indraprastha Gas"), ("MGL", "Mahanagar Gas"),
    # Cement
    ("SHREECEM", "Shree Cement"), ("RAMCOCEM", "Ramco Cements"), ("DALMIABJHI", "Dalmia Bharat"),
    ("JKCEMENT", "JK Cement"), ("BIRLA CORP", "Birla Corporation"),
    # Telecom
    ("IDEA", "Vodafone Idea"), ("TATACOMM", "Tata Communications"),
    # Defence
    ("BDL", "Bharat Dynamics"), ("MAZAGON", "Mazagon Dock"), ("GRSE", "Garden Reach Shipbuilders"),
    ("COCHINSHIP", "Cochin Shipyard"),
    # Railways
    ("RVNL", "Rail Vikas Nigam"), ("TITAGARH", "Titagarh Rail"),
]

# Build lookup index
_INDEX: list[dict] = []
_SEEN = set()
for suffix, name in _NSE_STOCKS:
    ticker = f"{suffix}.NS"
    if ticker in _SEEN:
        continue
    _SEEN.add(ticker)
    _INDEX.append({
        "ticker": ticker,
        "name": name,
        "search_key": f"{suffix} {name}".lower(),
    })


def search_stocks(query: str, limit: int = 10) -> list[dict]:
    """Search stocks by name or ticker prefix. Returns top matches."""
    q = query.lower().strip()
    if not q:
        return []

    exact = []
    prefix = []
    contains = []

    for stock in _INDEX:
        key = stock["search_key"]
        ticker_lower = stock["ticker"].lower().replace(".ns", "")

        if ticker_lower == q or q == stock["ticker"].lower():
            exact.append(stock)
        elif ticker_lower.startswith(q) or stock["name"].lower().startswith(q):
            prefix.append(stock)
        elif q in key:
            contains.append(stock)

    results = exact + prefix + contains
    return [{"ticker": s["ticker"], "name": s["name"]} for s in results[:limit]]
