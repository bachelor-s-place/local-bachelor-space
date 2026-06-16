package handler

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"bachelorsSpace/internal/domain/property"
	"bachelorsSpace/internal/domain/user"
	"bachelorsSpace/internal/middleware"
	"bachelorsSpace/internal/pkg/apierror"
	"bachelorsSpace/internal/pkg/respond"

	"github.com/go-chi/chi/v5"
	"github.com/go-playground/validator/v10"
)

type PropertyHandler struct {
	svc      *property.Service
	validate *validator.Validate
}

func NewPropertyHandler(svc *property.Service) *PropertyHandler {
	return &PropertyHandler{
		svc:      svc,
		validate: validator.New(),
	}
}

// CreateProperty handles POST /api/v1/properties
func (h *PropertyHandler) CreateProperty(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromContext(r.Context())

	var input property.CreatePropertyInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		respond.Error(w, apierror.ValidationError("invalid JSON body"))
		return
	}
	if err := h.validate.Struct(input); err != nil {
		respond.Error(w, apierror.ValidationError(err.Error()))
		return
	}

	id, err := h.svc.CreateProperty(r.Context(), userID, input)
	if err != nil {
		respond.Error(w, property.ToAPIError(err))
		return
	}

	respond.JSON(w, http.StatusCreated, map[string]string{"id": id})
}

// GetProperty handles GET /api/v1/properties/{id}
func (h *PropertyHandler) GetProperty(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	p, err := h.svc.GetProperty(r.Context(), id)
	if err != nil {
		respond.Error(w, property.ToAPIError(err))
		return
	}

	respond.JSON(w, http.StatusOK, p)
}

// SearchProperties handles GET /api/v1/properties
func (h *PropertyHandler) SearchProperties(w http.ResponseWriter, r *http.Request) {
	var filter property.SearchFilter
	q := r.URL.Query()

	if lat := q.Get("lat"); lat != "" {
		if v, err := strconv.ParseFloat(lat, 64); err == nil {
			filter.Lat = &v
		}
	}
	if lng := q.Get("lng"); lng != "" {
		if v, err := strconv.ParseFloat(lng, 64); err == nil {
			filter.Lng = &v
		}
	}
	if radius := q.Get("radius_km"); radius != "" {
		if v, err := strconv.ParseFloat(radius, 64); err == nil {
			filter.RadiusKm = &v
		}
	}
	if city := q.Get("city"); city != "" {
		filter.City = &city
	}
	if locality := q.Get("locality"); locality != "" {
		filter.Locality = &locality
	}
	if minRent := q.Get("min_rent"); minRent != "" {
		if v, err := strconv.ParseFloat(minRent, 64); err == nil {
			filter.MinRent = &v
		}
	}
	if maxRent := q.Get("max_rent"); maxRent != "" {
		if v, err := strconv.ParseFloat(maxRent, 64); err == nil {
			filter.MaxRent = &v
		}
	}
	if fg := q.Get("for_gender"); fg != "" {
		parts := strings.Split(fg, ",")
		if len(parts) > 0 && parts[0] != "" {
			filter.ForGender = &parts[0]
		}
	}

	// Validate required map search params (if one coordinate is provided, need all three)
	if filter.Lat != nil || filter.Lng != nil || filter.RadiusKm != nil {
		if filter.Lat == nil || filter.Lng == nil || filter.RadiusKm == nil {
			respond.Error(w, apierror.ValidationError("lat, lng, and radius_km must all be provided together for map search"))
			return
		}
		if *filter.RadiusKm <= 0 || *filter.RadiusKm > 100 {
			respond.Error(w, apierror.ValidationError("radius_km must be between 0 and 100"))
			return
		}
		if *filter.Lat < -90 || *filter.Lat > 90 || *filter.Lng < -180 || *filter.Lng > 180 {
			respond.Error(w, apierror.ValidationError("lat/lng are out of range"))
			return
		}
	}

	// Pass the viewer so gender segregation is enforced based on their profile.
	viewerID := middleware.UserIDFromContext(r.Context())
	results, err := h.svc.SearchProperties(r.Context(), viewerID, filter)
	if err != nil {
		respond.Error(w, property.ToAPIError(err))
		return
	}

	if results == nil {
		results = []property.Property{} // Return [] instead of null
	}

	respond.JSON(w, http.StatusOK, results)
}

// GetMyProperties handles GET /api/v1/properties/me
func (h *PropertyHandler) GetMyProperties(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromContext(r.Context())
	
	filter := property.SearchFilter{
		OwnerID: &userID,
	}

	// Empty viewerID: the owner sees all their own listings regardless of gender.
	results, err := h.svc.SearchProperties(r.Context(), "", filter)
	if err != nil {
		respond.Error(w, property.ToAPIError(err))
		return
	}

	if results == nil {
		results = []property.Property{} // Return [] instead of null
	}

	respond.JSON(w, http.StatusOK, results)
}

// UpdateProperty handles PUT /api/v1/properties/{id}
func (h *PropertyHandler) UpdateProperty(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromContext(r.Context())
	propertyID := chi.URLParam(r, "id")

	var input property.UpdatePropertyInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		respond.Error(w, apierror.ValidationError("invalid JSON body"))
		return
	}
	if err := h.validate.Struct(input); err != nil {
		respond.Error(w, apierror.ValidationError(err.Error()))
		return
	}

	if err := h.svc.UpdateProperty(r.Context(), userID, propertyID, input); err != nil {
		respond.Error(w, property.ToAPIError(err))
		return
	}

	respond.JSON(w, http.StatusOK, map[string]string{"message": "property updated successfully"})
}

// CreateRoom handles POST /api/v1/properties/{id}/rooms
func (h *PropertyHandler) CreateRoom(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromContext(r.Context())
	propertyID := chi.URLParam(r, "id")

	var input property.CreateRoomInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		respond.Error(w, apierror.ValidationError("invalid JSON body"))
		return
	}
	if err := h.validate.Struct(input); err != nil {
		respond.Error(w, apierror.ValidationError(err.Error()))
		return
	}

	id, err := h.svc.CreateRoom(r.Context(), userID, propertyID, input)
	if err != nil {
		respond.Error(w, property.ToAPIError(err))
		return
	}

	respond.JSON(w, http.StatusCreated, map[string]string{"id": id})
}

// GetRooms handles GET /api/v1/properties/{id}/rooms
func (h *PropertyHandler) GetRooms(w http.ResponseWriter, r *http.Request) {
	propertyID := chi.URLParam(r, "id")

	rooms, err := h.svc.GetRoomsByProperty(r.Context(), propertyID)
	if err != nil {
		respond.Error(w, property.ToAPIError(err))
		return
	}

	if rooms == nil {
		rooms = []property.Room{}
	}

	respond.JSON(w, http.StatusOK, rooms)
}

// UpdateRoom handles PUT /api/v1/properties/{id}/rooms/{roomId}
func (h *PropertyHandler) UpdateRoom(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromContext(r.Context())
	roomID := chi.URLParam(r, "roomId")

	var input property.UpdateRoomInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		respond.Error(w, apierror.ValidationError("invalid JSON body"))
		return
	}
	if err := h.validate.Struct(input); err != nil {
		respond.Error(w, apierror.ValidationError(err.Error()))
		return
	}

	if err := h.svc.UpdateRoom(r.Context(), userID, roomID, input); err != nil {
		respond.Error(w, property.ToAPIError(err))
		return
	}

	respond.JSON(w, http.StatusOK, map[string]string{"message": "room updated successfully"})
}

// Routes returns the property routes.
func (h *PropertyHandler) Routes() chi.Router {
	r := chi.NewRouter()
	
	// Anyone authenticated can view/search
	r.Get("/", h.SearchProperties)
	r.Get("/{id}", h.GetProperty)
	r.Get("/{id}/rooms", h.GetRooms)

	// Only landlords can create/manage their own
	r.Group(func(r chi.Router) {
		r.Use(middleware.RequireRole(user.RoleLandlord))
		r.Get("/me", h.GetMyProperties)
		r.Post("/", h.CreateProperty)
		r.Put("/{id}", h.UpdateProperty)
		r.Post("/{id}/rooms", h.CreateRoom)
		r.Put("/{id}/rooms/{roomId}", h.UpdateRoom)
	})

	return r
}
